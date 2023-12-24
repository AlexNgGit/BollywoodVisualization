class Heatmap {
    constructor(_config, _dataFull, _dataCrew, dispatch) {
    
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: window.innerWidth - 200,
            containerHeight: 560,
            heatmapWidth: window.innerWidth - 20,
            heatmapHeight: _config.heatmapHeight,
            margin: {
              top: 30,
              right: 15,
              bottom: 20,
              left: 30,
            },
            tooltipPadding: _config.tooltipPadding || 15,
            legendWidth: 160,
            legendBarHeight: 10
        };
        this.dispatch = dispatch
        this.globalDecade = "";
        this.globalBaseLine = {};
        this.dataFull = _dataFull;
        this.dataCrew = _dataCrew;
        this.variables = ["Drama", "Horror", "Comedy", "Animation", "Documentary", 
        "Short Drama", "Short Horror", "Short Comedy", "Short Animation", "Short Documentary",
        "Long Drama", "Long Horror", "Long Comedy", "Long Animation", "Long Documentary",
        "Long", "Short","Low Rating", "High Rating",
        "High Rating Drama", "High Rating Horror", "High Rating Comedy", "High Rating Animation", "High Rating Documentary",
        "Low Rating Drama", "Low Rating Horror", "Low Rating Comedy", "Low Rating Animation", "Low Rating Documentary",
    ];
    this.timeLine = [1960, 1970, 1980, 1990, 2000, 2010, 2020]
    this.initVis();
    }
    
    initVis(){
    let vis = this;
    //initiate the config's parameters     
    vis.config.width = vis.config.heatmapWidth - vis.config.margin.left - vis.config.margin.right;
    vis.config.height = vis.config.heatmapHeight - vis.config.margin.top - vis.config.margin.bottom;
    
    //initiate the scales    
    vis.xScale = d3
      .scaleBand()
      .domain(vis.timeLine)
      .range([180, vis.config.width])

    vis.yScale = d3
        .scaleBand()
        .domain(vis.variables)
        .range([vis.config.height, 20]);
    //add axis    
    vis.xAxis = d3.axisBottom(vis.xScale).
                tickSize(0)
                .tickFormat(d => {
                    switch(d) {
                        case 1960: return "50s"
                        case 1970: return "60s"
                        case 1980: return "70s"
                        case 1990: return "80s"
                        case 2000: return "90s"
                        case 2010: return "00s"
                        case 2020: return "10s"
                    }
                })

    vis.yAxis = d3
      .axisLeft(vis.yScale)
      .tickSize(0)
    //create svg component
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("id", "heatmap")
      .attr("width", vis.config.heatmapWidth)
      .attr("height", vis.config.heatmapHeight)
    //add chart area  
    vis.chart = vis.svg.append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top - 8})`
      );

    vis.xAxisG = vis.chart
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.config.height + 5})`);

    vis.yAxisG = vis.chart.append("g")
        .attr("class", "axis y-axis")
        .attr("text-anchor", "start")
    
    vis.sliderG = vis.chart
        .append("g")
        .attr("class", "sliderG")
        .attr("transform", `translate(180,${vis.config.height + 5})`);
    
        //color scale    
    vis.colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateHcl(d3.rgb('#8B0000'), d3.rgb('#006400')));   

    //legend
    
    vis.legend = vis.svg.append('g')
    .attr('transform', `translate(${vis.config.containerWidth - vis.config.margin.right},0)`);

    vis.legendColorGradient = vis.legend.append('defs').append('linearGradient')
        .attr('id', 'linear-gradient');

    vis.legendColorRamp = vis.legend.append('rect')
        .attr('width', vis.config.legendWidth)
        .attr('height', vis.config.legendBarHeight)
        .attr('fill', 'url(#linear-gradient)');
    
        vis.xLegendScale = d3.scaleLinear()
        .range([0, vis.config.legendWidth]);

    vis.xLegendAxis = d3.axisBottom(vis.xLegendScale)
        .ticks(5)
        .tickSize(vis.config.legendBarHeight + 3)
        .tickFormat(d3.format('d'));

    vis.xLegendAxisG = vis.legend.append('g')
        .attr('class', 'axis x-axis legend-axis');   
        
    //vis title
    vis.svg.append('text')
       .text("Heatmap Depicting Percentage Changes in Movies Counts Across the decades")
       .attr('dx', '1.5rem')
       .attr('dy', '1.5rem')      
    
    vis.updateVis()
    }

    updateVis(){
        this.preprocessData();
        
        this.colorScale.domain([-100, 100])
        
        this.processBaseLine()
        let vis = this
        vis.renderVis()
        vis.renderLegend()
    }

    renderVis() {
        let vis = this;
        //render the heatmap's tiles
        vis.variables.forEach(
            (element) => {
                vis.chart.selectAll(".rect-point")
                .data(vis.groupedData)
                .join("rect")
                .attr("class", "rect-mark")
                .attr("x",  d => vis.xScale(d[0]))
                .attr("y", d => vis.yScale(element))
                .attr("width", vis.xScale.bandwidth)
                .attr("height", vis.yScale.bandwidth() )
                .attr('fill', d => {
                    if (d[0] <= this.globalDecade) {
                        return "gray";
                    }
                    let baseline = this.globalBaseLine[element];
                    let cmp = vis.mapVariable(element, d);
                    let percent = (cmp - baseline)/(baseline) * 100;
                    if (percent > 100) percent = 100;
                    if (percent < -100) percent = -100;
                    return vis.colorScale(percent)
                })
                .attr('stroke', "black")
                .on("mouseover", function (event, d) {
                    let baseline = vis.globalBaseLine[element];
                    let cmp = vis.mapVariable(element, d);
                    let percent = (cmp - baseline)/(baseline) * 100;
                    if (percent > 100) percent = 100;
                    if (percent < -100) percent = -100;
                    d3
                      .select("#tooltip")
                      .style("display", "block")
                      .style("left", event.pageX + vis.config.tooltipPadding + "px")
                      .style("top", event.pageY + vis.config.tooltipPadding + "px").html(`
                        <div class="tooltip-title">Percentage change in movies compared to the threshold year: ${vis.globalDecade}</div>
                        <div><i>Category:${element}</i></div>
                        <div><i>Percentage:${parseInt(percent)}</i></div>
                    `);
                  })
                  .on("mouseleave", function (event, d) {
                    d3.select("#tooltip").style("display", "none");
                  })
                  .on("click", function(event, d) {
                    let isActive = d3.select(this).classed('active')
                    let oldArr = moviesSelectedByGenre;
                    const id = `${element}_${d[0]}`
                    let retArr = {id, movies: []}
            
                    
                    if (isActive) {
                        // remove "retArr" movies from "oldArr"
                        d3.select(this).classed('active', false)
                        moviesSelectedByGenre = oldArr.filter(obj => obj.id !== id)
                        vis.selectRect = ""
                        vis.dispatch.call("heatMapEvent", event, oldArr, false)
                        return;
                    }

                    let keys = element.split(" ");
                    if (keys.length === 1) {
                        if (keys[0] === "Short") {
                            retArr.movies = d[1].filter(element => element.isShort) 
                        } else if (keys[0] === "Long") {
                            retArr.movies = d[1].filter(element => !element.isShort)
                        } else {
                            retArr.movies = d[1].filter(element => element.genres.includes(keys[0]))
                        }
                    } else if (keys.length === 2) {
                        if (keys[0] === "High") {
                            retArr.movies = d[1].filter(element => element.isAboveAverage)
                        } else if (keys[0] === "Low") {
                            retArr.movies = d[1].filter(element => !element.isAboveAverage)
                        } else if (keys[0] === "Short") {
                            retArr.movies = d[1].filter(element => element.isShort && element.genres.includes(keys[1]))
                        } else if (keys[0] === "Long") {
                            retArr.movies = d[1].filter(element => !element.isShort && element.genres.includes(keys[1]))
                        }
                    } else if (keys.length === 3) {
                        if (keys[0] === "High") {
                            retArr.movies = d[1].filter(element => element.isAboveAverage && element.genres.includes(keys[2]))
                        } else if (keys[0] === "Low") {
                            retArr.movies = d[1].filter(element =>  !element.isAboveAverage && element.genres.includes(keys[2]))
                        } 
                    }
                    d3.select(this).classed('active', true);
                    vis.dispatch.call("heatMapEvent", event, retArr, true)
                  })
            }
        )
        
    //render the slider    
        let slider = d3.sliderHorizontal()
        .min(0)
        .max(7)
        .step(1)
        .width(vis.config.width - 180)
        .value(1)
        .displayValue(false);

        slider
            .ticks(6)
            .tickFormat(d => "")
        
        slider.on('onchange', val => {
                this.globalDecade = this.mapSliderValue(val)
                this.updateVis()
            }  
        )
        //call the axis    
        vis.xAxisG.call(vis.xAxis).call((g) => g.select(".domain").remove())
                                
        vis.sliderG.call(slider)
                                  
        vis.yAxisG.call(vis.yAxis).call((g) => g.select(".domain").remove())
            .attr('text-anchor', 'start'); 
        

    }

    renderLegend() {
    let vis = this;
    vis.legendColorGradient.selectAll('stop')
        .data(vis.colorScale.range())
        .join('stop')
        .attr('offset', (d,i) => {
            return i/(vis.colorScale.range().length-1)})
        .attr('stop-color', d => d);

        vis.xLegendScale.domain(vis.colorScale.domain()).nice();
    const extent = vis.xLegendScale.domain();

    // Manually calculate tick values
    vis.xLegendAxis.tickValues([
    extent[0],
    parseInt(extent[0]/2),
    parseInt(0),
    parseInt(extent[1]/2),
    extent[1]
    ]);

    // Update legend axis
    vis.xLegendAxisG.call(vis.xLegendAxis);

    }

    processBaseLine() {
        if (this.globalDecade.length === 0) {
            this.globalDecade = 1960
        }
        let keys = Object.keys(this.groupedData[0][2]);
        keys.forEach(variable =>  this.globalBaseLine[variable] = 1)

        this.groupedData.forEach(element => {
            if (element[0] === this.globalDecade) {
                keys.forEach(variable =>  this.globalBaseLine[variable] += element[2][variable]
                )  
            }
        })
    }

    preprocessData() {
        let vis = this;
        let genresArr = ["Drama", "Horror", "Comedy", "Animation", "Documentary"]
        vis.dataFull = vis.dataFull.filter(d => !isNaN(d.runtime) 
        && !isNaN(d.imdb_rating) 
        &&!isNaN(d.year_of_release))
        vis.dataFull.forEach(element => {
            element.runtime = Number(element.runtime);
            this.tranformGenres(element)
            this.tranformDecade(element)
            element.isShort = element.runtime <= 40;
            element.isAboveAverage = element.imdb_rating >= 5
        })


        vis.groupedData = d3.groups(vis.dataFull, d => d.decades)
        
        vis.groupedData.forEach(element =>{
            let decades = element[0]
            let movieObjs = element[1]
            let stat = {};
            
            stat.Short = d3.filter(movieObjs, sub => sub.isShort).length
            stat.Long = movieObjs.length - stat.Short; 
            stat["High Rating"] = d3.filter(movieObjs, sub => sub.isAboveAverage).length
            stat["Low Rating"] = movieObjs.length - stat["High Rating"];
           
        
            genresArr.forEach(d => {
                stat[d] = d3.filter(movieObjs, sub => sub.genres.includes(d)).length
                stat["Short " + d] = d3.filter(movieObjs, sub => (sub.genres.includes(d) && sub.isShort)).length
                stat["Long " + d] = d3.filter(movieObjs, sub => (sub.genres.includes(d) && !sub.isShort)).length
                stat["High Rating " + d] = d3.filter(movieObjs, sub => (sub.genres.includes(d) && sub.isAboveAverage)).length
                stat["Low Rating " + d] = d3.filter(movieObjs, sub => (sub.genres.includes(d)  && !sub.isAboveAverage)).length
            })
                  element.push(stat)
        })
    }

    mapSliderValue(value) {
        switch (value) {
            case 0: return 1950
            case 1: return 1960
            case 2: return 1970
            case 3: return 1980
            case 4: return 1990
            case 5: return 2000
            case 6: return 2010
            case 7: return 2020
        }
    }

    tranformGenres(element) {
        if (element.genres.includes("War")
            || element.genres.includes("Thriller")
            || element.genres.includes("Action")
            || element.genres.includes("Adventure")
            || element.genres.includes("Romance")
            || element.genres.includes("Musical")
            || element.genres.includes("Fantasy")
            || element.genres.includes("Sci-Fi")
            || element.genres.includes("Mystery")
            || element.genres.includes("Crime")
            || element.genres.includes("Family")) {
                element.genres = "Drama"
            } else if (element.genres.includes("Biography") || element.genres.includes("History")) {
                element.genres = "Documentary";
        }    
    }
        tranformDecade(element) {
        if (element.year_of_release >= 1950 && element.year_of_release < 1960) {
            element.decades = 1960
        } else if (element.year_of_release >= 1960 && element.year_of_release < 1970){
            element.decades = 1970
        } else if (element.year_of_release >= 1970 && element.year_of_release < 1980) {
            element.decades = 1980
        }  else if (element.year_of_release >= 1980 && element.year_of_release < 1990){
            element.decades = 1990
        } if (element.year_of_release >= 1990 && element.year_of_release < 2000) {
            element.decades = 2000
        } else if (element.year_of_release >= 2000 && element.year_of_release < 2010){
            element.decades = 2010
        } else if (element.year_of_release >= 2010 && element.year_of_release < 2020) {
            element.decades = 2020
        }
    }

    mapVariable = (element, d) => {
        for (let i = 0; i < this.variables.length; i++) {
            if (element ===  this.variables[i]) {
                return d[2][element];
            }
        }
    }

}