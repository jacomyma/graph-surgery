// Note: works on directed networks only for now
var settings = {}

// Feel free to edit following settings

// WHICH NODE ATTRIBUTE TO ANALYZE?
settings.attribute = 'Language' // This only works for the demo network

// --- (end of settings)

// Look at the types of values
var attData = {}
attData.types = {}
g.nodes().forEach(function(nid){
	var t = getType(g.getNodeAttribute(nid, settings.attribute))
	attData.types[t] = (attData.types[t] || 0) + 1
})

// Guess type of the attribute
var types = attData.types
if (types.string !== undefined) {
	attData.type = 'string'
} else if (types.float !== undefined) {
	attData.type = 'float'
} else if (types.integer !== undefined) {
	attData.type = 'integer'
} else {
	attData.type = 'error'
}

// Aggregate distribution of values
attData.valuesIndex = {}
g.nodes().forEach(function(nid){
	var n = g.getNodeAttributes(nid)
	attData.valuesIndex[n[settings.attribute]] = (attData.valuesIndex[n[settings.attribute]] || 0) + 1
})
attData.values = d3.keys(attData.valuesIndex)
var valuesCounts = d3.values(attData.valuesIndex)
attData.valuesStats = {}
attData.valuesStats.differentValues = valuesCounts.length
attData.valuesStats.sizeOfSmallestValue = d3.min(valuesCounts)
attData.valuesStats.sizeOfBiggestValue = d3.max(valuesCounts)
attData.valuesStats.medianSize = d3.median(valuesCounts)
attData.valuesStats.deviation = d3.deviation(valuesCounts)
attData.valuesStats.valuesUnitary = valuesCounts.filter(function(d){return d==1}).length
attData.valuesStats.valuesAbove1Percent = valuesCounts.filter(function(d){return d>=g.order*0.01}).length
attData.valuesStats.valuesAbove10Percent = valuesCounts.filter(function(d){return d>=g.order*0.1}).length

// Count edge flow
attData.valueFlow = {}
attData.values.forEach(function(v1){
	attData.valueFlow[v1] = {}
	attData.values.forEach(function(v2){
		attData.valueFlow[v1][v2] = {count: 0}
	})
})
g.edges().forEach(function(eid){
	var nsid = g.source(eid)
	var ntid = g.target(eid)
	attData.valueFlow[g.getNodeAttribute(nsid, settings.attribute)][g.getNodeAttribute(ntid, settings.attribute)].count++
})

console.log('Attribute data', attData)

var div = d3.select('#playground').append('div')
drawFlowMatrix(div, attData)
drawDensityMatrix(div, attData)

// ---
// Functions

function getType(str){
	// Adapted from http://stackoverflow.com/questions/16775547/javascript-guess-data-type-from-string
  if (typeof str !== 'string') str = str.toString();
  var nan = isNaN(Number(str));
  var isfloat = /^\d*(\.|,)\d*$/;
  var commaFloat = /^(\d{0,3}(,)?)+\.\d*$/;
  var dotFloat = /^(\d{0,3}(\.)?)+,\d*$/;
  if (!nan){
      if (parseFloat(str) === parseInt(str)) return "integer";
      else return "float";
  }
  else if (isfloat.test(str) || commaFloat.test(str) || dotFloat.test(str)) return "float";
  else return "string";
}

function drawFlowMatrix(container, attData) {
	// Compute crossings
	var crossings = []
	var v1
	var v2
	for (v1 in attData.valueFlow) {
		for (v2 in attData.valueFlow[v1]) {
			crossings.push({
				v1: v1,
				v2: v2,
				count: attData.valueFlow[v1][v2].count
			})
		}
	}

	// Rank values by count
	var sortedValues = attData.values.sort(function(v1, v2){
		return attData.valuesIndex[v2] - attData.valuesIndex[v1]
	})
	var valueRanking = {}
	sortedValues.forEach(function(v, i){
		valueRanking[v] = i
	})

	// Draw SVG
	var maxR = 24
	var margin = {top: 120 + maxR, right: 24 + maxR, bottom: 24 + maxR, left: 120 + maxR}
	var width = 2 * maxR * (attData.values.length - 1)
	var height = width // square space

	var x = d3.scaleLinear()
	  .range([0, width]);

	var y = d3.scaleLinear()
	  .range([0, height]);

	var size = d3.scaleLinear()
	  .range([0, 0.95 * maxR])
	var a = function(r){
	  return Math.PI * Math.pow(r, 2)
	}

	var r = function(a){
	  return Math.sqrt(a/Math.PI)
	}

	x.domain([0, attData.values.length - 1])
	y.domain([0, attData.values.length - 1])
	size.domain(d3.extent(crossings, function(d){return r(d.count)}))

	var svg = container.append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Horizontal lines
	svg.selectAll('line.h')
	    .data(attData.values)
	  .enter().append('line')
	    .attr('class', 'h')
	    .attr('x1', 0)
	    .attr('y1', function(d){ return y(valueRanking[d]) })
	    .attr('x2', width)
	    .attr('y2', function(d){ return y(valueRanking[d]) })
	    .style("stroke", 'rgba(0, 0, 0, 0.06)')

	// Vertical lines
	svg.selectAll('line.v')
	    .data(attData.values)
	  .enter().append('line')
	    .attr('class', 'v')
	    .attr('x1', function(d){ return x(valueRanking[d]) })
	    .attr('y1', 0)
	    .attr('x2', function(d){ return x(valueRanking[d]) })
	    .attr('y2', height)
	    .style("stroke", 'rgba(0, 0, 0, 0.06)')

	// Arrow
	var arr = svg.append('g')
		.attr('class', 'arrow')
    .style("stroke", 'rgba(0, 0, 0, 0.4)')
	arr.append('line')
    .attr('x1', -24 - maxR)
    .attr('y1', -24)
    .attr('x2', -24 - maxR)
    .attr('y2', -24 - maxR)
	arr.append('line')
    .attr('x1', -24 - maxR)
    .attr('y1', -24 - maxR)
    .attr('x2', -24)
    .attr('y2', -24 - maxR)
	arr.append('line')
    .attr('x1', -24)
    .attr('y1', -24 - maxR)
    .attr('x2', -24 - 6)
    .attr('y2', -24 - maxR - 6)
	arr.append('line')
    .attr('x1', -24)
    .attr('y1', -24 - maxR)
    .attr('x2', -24 - 6)
    .attr('y2', -24 - maxR + 6)

	// Horizontal labels
	svg.selectAll('text.h')
	    .data(attData.values)
	  .enter().append('text')
	    .attr('class', 'h')
	    .attr('x', -6-maxR)
	    .attr('y', function(d){ return y(valueRanking[d]) + 3 })
	    .text( function (d) { return d })
	    .style('text-anchor', 'end')
	    .attr("font-family", "sans-serif")
	    .attr("font-size", "12px")
	    .attr("fill", 'rgba(0, 0, 0, 0.5)')

	// Vertical labels
	svg.selectAll('text.v')
	    .data(attData.values)
	  .enter().append('text')
	    .attr('class', 'v')
	    .attr('x', function(d){ return x(valueRanking[d]) + 3 })
	    .attr('y', -6-maxR)
	    .text( function (d) { return d })
	    .style('text-anchor', 'end')
	    .style('writing-mode', 'vertical-lr')
	    .attr("font-family", "sans-serif")
	    .attr("font-size", "12px")
	    .attr("fill", 'rgba(0, 0, 0, 0.5)')

	// Dots
	var dot = svg.selectAll(".dot")
	    .data(crossings)
	  .enter().append('g')
	  
	dot.append("circle")
	  .attr("class", "dot")
	  .attr("r", function(d) { return size( r(d.count) ) })
	  .attr("cx", function(d) { return x(valueRanking[d.v2]) })
	  .attr("cy", function(d) { return y(valueRanking[d.v1]) })
	  .style("fill", 'rgba(120, 120, 120, 0.3)')

 	dot.append('text')
    .attr('x', function(d){ return x(valueRanking[d.v2]) })
    .attr('y', function(d){ return y(valueRanking[d.v1]) + 4 })
    .text( function (d) { return d.count })
    .style('text-anchor', 'middle')
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px")
    .attr("fill", 'rgba(0, 0, 0, 1.0)')
}

function drawDensityMatrix(container, attData) {
	// Compute crossings
	var crossings = []
	var v1
	var v2
	for (v1 in attData.valueFlow) {
		for (v2 in attData.valueFlow[v1]) {
			crossings.push({
				v1: v1,
				v2: v2,
				density: attData.valueFlow[v1][v2].count / (attData.valuesIndex[v1] * attData.valuesIndex[v2])
			})
		}
	}

	// Rank values by count
	var sortedValues = attData.values.sort(function(v1, v2){
		return attData.valuesIndex[v2] - attData.valuesIndex[v1]
	})
	var valueRanking = {}
	sortedValues.forEach(function(v, i){
		valueRanking[v] = i
	})

	// Draw SVG
	var maxR = 24
	var margin = {top: 120 + maxR, right: 24 + maxR, bottom: 24 + maxR, left: 120 + maxR}
	var width = 2 * maxR * (attData.values.length - 1)
	var height = width // square space

	var x = d3.scaleLinear()
	  .range([0, width]);

	var y = d3.scaleLinear()
	  .range([0, height]);

	var size = d3.scaleLinear()
	  .range([0, 0.95 * maxR])

	var a = function(r){
	  return Math.PI * Math.pow(r, 2)
	}

	var r = function(a){
	  return Math.sqrt(a/Math.PI)
	}

	x.domain([0, attData.values.length - 1])
	y.domain([0, attData.values.length - 1])
	size.domain(d3.extent(crossings, function(d){return r(d.density)}))

	var svg = container.append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Horizontal lines
	svg.selectAll('line.h')
	    .data(attData.values)
	  .enter().append('line')
	    .attr('class', 'h')
	    .attr('x1', 0)
	    .attr('y1', function(d){ return y(valueRanking[d]) })
	    .attr('x2', width)
	    .attr('y2', function(d){ return y(valueRanking[d]) })
	    .style("stroke", 'rgba(0, 0, 0, 0.06)')

	// Vertical lines
	svg.selectAll('line.v')
	    .data(attData.values)
	  .enter().append('line')
	    .attr('class', 'v')
	    .attr('x1', function(d){ return x(valueRanking[d]) })
	    .attr('y1', 0)
	    .attr('x2', function(d){ return x(valueRanking[d]) })
	    .attr('y2', height)
	    .style("stroke", 'rgba(0, 0, 0, 0.06)')

	// Arrow
	var arr = svg.append('g')
		.attr('class', 'arrow')
    .style("stroke", 'rgba(0, 0, 0, 0.4)')
	arr.append('line')
    .attr('x1', -24 - maxR)
    .attr('y1', -24)
    .attr('x2', -24 - maxR)
    .attr('y2', -24 - maxR)
	arr.append('line')
    .attr('x1', -24 - maxR)
    .attr('y1', -24 - maxR)
    .attr('x2', -24)
    .attr('y2', -24 - maxR)
	arr.append('line')
    .attr('x1', -24)
    .attr('y1', -24 - maxR)
    .attr('x2', -24 - 6)
    .attr('y2', -24 - maxR - 6)
	arr.append('line')
    .attr('x1', -24)
    .attr('y1', -24 - maxR)
    .attr('x2', -24 - 6)
    .attr('y2', -24 - maxR + 6)

	// Horizontal labels
	svg.selectAll('text.h')
	    .data(attData.values)
	  .enter().append('text')
	    .attr('class', 'h')
	    .attr('x', -6-maxR)
	    .attr('y', function(d){ return y(valueRanking[d]) + 3 })
	    .text( function (d) { return d })
	    .style('text-anchor', 'end')
	    .attr("font-family", "sans-serif")
	    .attr("font-size", "12px")
	    .attr("fill", 'rgba(0, 0, 0, 0.5)')

	// Vertical labels
	svg.selectAll('text.v')
	    .data(attData.values)
	  .enter().append('text')
	    .attr('class', 'v')
	    .attr('x', function(d){ return x(valueRanking[d]) + 3 })
	    .attr('y', -6-maxR)
	    .text( function (d) { return d })
	    .style('text-anchor', 'end')
	    .style('writing-mode', 'vertical-lr')
	    .attr("font-family", "sans-serif")
	    .attr("font-size", "12px")
	    .attr("fill", 'rgba(0, 0, 0, 0.5)')

	// Dots
	var dot = svg.selectAll(".dot")
	    .data(crossings)
	  .enter().append('g')
	  
	dot.append("circle")
	  .attr("class", "dot")
	  .attr("r", function(d) { return size( r(d.density) ) })
	  .attr("cx", function(d) { return x(valueRanking[d.v2]) })
	  .attr("cy", function(d) { return y(valueRanking[d.v1]) })
	  .style("fill", 'rgba(120, 120, 120, 0.3)')

 	dot.append('text')
    .attr('x', function(d){ return x(valueRanking[d.v2]) })
    .attr('y', function(d){ return y(valueRanking[d.v1]) + 4 })
    .text( function (d) { return formatDensityNumber(d.density) })
    .style('text-anchor', 'middle')
    .attr("font-family", "sans-serif")
    .attr("font-size", "10px")
    .attr("fill", 'rgba(0, 0, 0, 1.0)')

	function formatDensityNumber(d) {
   	return (d * 100).toFixed(2) + '%'
  }
}