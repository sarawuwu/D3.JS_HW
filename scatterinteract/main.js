//Data utilities
//遇到NA就設定為undefined, 要不然就維持原本的字串
const parseNA = string => (string === 'NA' ? undefined : string);
//日期處理
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

function type(d) {
    const date = parseDate(d.release_date);
    return {
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d => d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count,

    }
}

//Data selection
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

function formatTicks(d) {
    return d3.format('~s')(d)
        .replace('M', 'mil')
        .replace('G', 'bil')
        .replace('T', 'tri')
}

function prepareScatterData(data) {
    return data.sort((a, b) => b.budget - a.budget).filter((d, i) => i < 100);
}

function addLabel(axis, label, x, y) {
    /* axis 是呼叫者 - 哪一個軸 */
    axis.selectAll('.tick:last-of-type text')
        .clone()
        .text(label)
        .attr('x', x).attr('y', y)
        .style('text-anchor', 'start')
        .style('font-weight', 'bold')
        .style('fill', '#555');
}

function setupCanvas(scatterData) {
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 40, bottom: 40, left: 80 };
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    const this_svg = d3.select('.scatter-plot-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height)
        .append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);

    //scale
    //d3.extent find the max & min in budget
    const xExtent = d3.extent(scatterData, d => d.budget);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, chart_width]);
    //垂直空間的分配 - 平均分布給各種類
    const yExtent = d3.extent(scatterData, d => d.revenue)
    const yScale = d3.scaleLinear().domain(yExtent).range([chart_height, 0]);//營收最小的放最下方，與座標相反


    //一夜情 沒用到不需要知道名字
    //const bars = 
    this_svg.selectAll('.scatter').data(scatterData).enter()
        .append('circle').attr('class', 'scatter')
        .attr('cx', d => xScale(d.budget))
        .attr('cy', d => yScale(d.revenue))
        .attr('r', 3)
        .style('fill', 'orange')
        .style('fill-opacity', 0.7);

    const header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`)
        .append('text');
    // header.append('tspan').text('Budget vs. Revenue in $US')
    //     .style('font-size', '1.5em')
    //     .style('fill', '#aaa');
    // header.append('tspan').text('Top 100 films by budget, 2000-2009')
    //     .attr('x', 0).attr('y', 20)
    //     .style('font-size', '0.8em')
    //     .style('fill', 'pink');

    //ticks 決定約略有幾個刻度(依數值狀況)
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height).tickSizeOuter(0);
    const xAxisDraw = this_svg.append('g').attr('class', 'x axis')
        .attr('transform', `translate(-10,${chart_height + 10})`)
        .call(xAxis)
        .call(addLabel, 'Budget', 25, 0);
    //拉開字與軸的距離
    xAxisDraw.selectAll('text').attr('dy', '2em');

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height).tickSizeOuter(0);
    const yAxisDraw = this_svg.append('g').attr('class', 'y axis')
        .attr('transform', `translate(-10,10)`)
        .call(yAxis)
        .call(addLabel, 'Revenue', -30, -30);
    //拉開字與軸的距離
    yAxisDraw.selectAll('text').attr('dx', '-2em');

    function brushed(e) {
        // debugger;
        if (e.selection) {
            const [[x0, y0], [x1, y1]] = e.selection;

            const selected = scatterData.filter(
                d =>
                    x0 <= xScale(d.budget) && xScale(d.budget) < x1 &&
                    y0 <= yScale(d.revenue) && yScale(d.revenue) < y1
            );
            // console.log(selected);
            updateSelected(selected);
            highlightSelected(selected);
        } else {
            d3.select('.selected-body').html('');
            highlightSelected([]);
        }

    }

    function highlightSelected(data) {
        const selectedIDs = data.map(d => d.id);
        d3.selectAll('.scatter').filter(d => selectedIDs.includes(d.id))
            .style('fill', 'green');
        d3.selectAll('.scatter').filter(d => !selectedIDs.includes(d.id))
            .style('fill',
                'orange');
    }

    let selectedId;
    function mouseoverListItem() {
        selectedId = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selectedId)
            .transition().attr('r', 6).style('fill', 'coral');
    }
    function mouseoutListItem() {
        selectedId = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selectedId)
            .transition().attr('r', 3).style('fill', 'orange')
    }

    function updateSelected(data) {
        d3.select('.selected-body').selectAll('.selected-element')
            .on('mouseover', mouseoverListItem)
            .on('mouseout', mouseoutListItem)
            .data(data, d => d.id).join(
                enter => {
                    enter.append('p').attr('class', 'selected-element')
                        .html(
                            d => `<span class="selected-title">${d.title}</span>,
                                ${d.release_year}
                                <br>budget:${formatTicks(d.budget)} |
                                revenue: ${formatTicks(d.revenue)}`
                        );
                },
                update => {
                    update
                },
                exit => {
                    exit.remove();
                }
            )
    }

    const brush = d3.brush().extent([[0, 0], [svg_width, svg_height]]).on('brush end', brushed);
    this_svg.append('g').attr('class', 'brush').call(brush);

    d3.select('.selected-container').style('width', `${svg_width}px`).style('height', `${svg_height}px`);
}



//Main
function ready(movies) {
    const moviesClean = filterData(movies);
    const scatterData = prepareScatterData(moviesClean);
    console.log(scatterData);
    setupCanvas(scatterData);

}

//Load Data
d3.csv('movies.csv', type).then(
    res => {
        ready(res);
        //console.log(res);
    }
)


// 字串轉數字在字串前加一個+

