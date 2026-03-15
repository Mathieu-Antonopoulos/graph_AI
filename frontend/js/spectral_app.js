let current_data = null


function init_app(){

    const slider = document.getElementById("weight-slider")

    slider.addEventListener("input", async ()=>{

        const w = parseFloat(slider.value)

        document.getElementById("weight-value").innerText = w.toFixed(2)

        send_message("set-weight", w)

        const msg = await wait_for_message("spectral-update")

        render(msg.data.content)

    })

    wait_for_message("spectral-update")
        .then(msg => render(msg.data.content))

}


function render(data){

    current_data = data

    draw_graph(data.graph)

    draw_embedding(data.spectral.embedding)

    draw_eigenvalues(data.spectral.eigenvalues)

    draw_eigenvectors(data.spectral.eigenvectors)

    draw_eigenvector_heatmap(data.spectral.eigenvectors)

    draw_cheeger_demo(data.graph, data.spectral.eigenvectors[1])
}

function draw_graph(graph){

    const width = 320
    const height = 280
    const pad = 40

    const svg = d3.select("#graph")
        .html("")
        .append("svg")
        .attr("width",width)
        .attr("height",height)

    const x = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.x))
        .range([pad,width-pad])

    const y = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.y))
        .range([height-pad,pad])

    svg.selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attr("x1",d=>x(graph.nodes[d.source].x))
        .attr("y1",d=>y(graph.nodes[d.source].y))
        .attr("x2",d=>x(graph.nodes[d.target].x))
        .attr("y2",d=>y(graph.nodes[d.target].y))
        .attr("stroke","#777")
        .attr("stroke-width",d=>2*d.weight)

    const nodes = svg.selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("cx",d=>x(d.x))
        .attr("cy",d=>y(d.y))
        .attr("r",6)
        .attr("fill","#2E86DE")

    svg.selectAll("text.node-id")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr("x",d=>x(d.x)+8)
        .attr("y",d=>y(d.y)+4)
        .text(d=>d.id)
        .attr("font-size","11px")
}

function draw_embedding(points){

    const width = 320
    const height = 280
    const pad = 50

    const svg = d3.select("#embedding")
        .html("")
        .append("svg")
        .attr("width",width)
        .attr("height",height)

    const x = d3.scaleLinear()
        .domain(d3.extent(points,d=>d[0]))
        .range([pad,width-pad])

    const y = d3.scaleLinear()
        .domain(d3.extent(points,d=>d[1]))
        .range([height-pad,pad])

    svg.append("g")
        .attr("transform",`translate(0,${height-pad})`)
        .call(d3.axisBottom(x))

    svg.append("g")
        .attr("transform",`translate(${pad},0)`)
        .call(d3.axisLeft(y))

    svg.append("text")
        .attr("x",width/2)
        .attr("y",height-5)
        .attr("text-anchor","middle")
        .text("v₂ coordinate")

    svg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-height/2)
        .attr("y",15)
        .attr("text-anchor","middle")
        .text("v₃ coordinate")

    svg.selectAll("circle")
        .data(points)
        .enter()
        .append("circle")
        .attr("cx",d=>x(d[0]))
        .attr("cy",d=>y(d[1]))
        .attr("r",6)
        .attr("fill","#2E86DE")

    svg.selectAll("text.idx")
        .data(points)
        .enter()
        .append("text")
        .attr("x",d=>x(d[0])+8)
        .attr("y",d=>y(d[1])+4)
        .text((d,i)=>i)
        .attr("font-size","11px")
}

function draw_eigenvalues(vals){

    vals = vals.map(v=>Math.max(0,v))

    const width = 320
    const height = 280
    const pad = 50

    const svg = d3.select("#eigenvalues")
        .html("")
        .append("svg")
        .attr("width",width)
        .attr("height",height)

    const x = d3.scaleBand()
        .domain(d3.range(vals.length))
        .range([pad,width-pad])
        .padding(0.2)

    const y = d3.scaleLinear()
        .domain([0,d3.max(vals)])
        .range([height-pad,pad])

    svg.append("g")
        .attr("transform",`translate(0,${height-pad})`)
        .call(d3.axisBottom(x).tickFormat(i=>`λ${i+1}`))

    svg.append("g")
        .attr("transform",`translate(${pad},0)`)
        .call(d3.axisLeft(y))

    svg.append("text")
        .attr("x",width/2)
        .attr("y",height-5)
        .attr("text-anchor","middle")
        .text("Eigenvalue index")

    svg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-height/2)
        .attr("y",15)
        .attr("text-anchor","middle")
        .text("Eigenvalue")

    svg.selectAll("rect")
        .data(vals.slice(0,6))
        .enter()
        .append("rect")
        .attr("x",(d,i)=>x(i))
        .attr("y",d=>y(d))
        .attr("width",x.bandwidth())
        .attr("height",d=>Math.max(0,height-pad-y(d)))
        .attr("fill",(d,i)=> i==1 ? "#e74c3c" : "#27AE60")

}

function draw_eigenvectors(vecs){

    const width = 420
    const height = 300
    const pad = 50

    const container = d3.select("#eigenvectors").html("")

    // legend
    const legend = container.append("div")
        .style("display","flex")
        .style("gap","18px")
        .style("margin-bottom","10px")

    const svg = container.append("svg")
        .attr("width",width)
        .attr("height",height)

    const k = Math.min(4, vecs.length)
    const n = vecs[0].length

    const flat = vecs.slice(0,k).flat()

    const x = d3.scalePoint()
        .domain(d3.range(n))
        .range([pad,width-pad])

    const y = d3.scaleLinear()
        .domain([d3.min(flat), d3.max(flat)])
        .nice()
        .range([height-pad,pad])

    // axes
    svg.append("g")
        .attr("transform",`translate(${pad},0)`)
        .call(d3.axisLeft(y))

    svg.append("g")
        .attr("transform",`translate(0,${y(0)})`)
        .call(d3.axisBottom(x))

    svg.append("line")
        .attr("x1",pad)
        .attr("x2",width-pad)
        .attr("y1",y(0))
        .attr("y2",y(0))
        .attr("stroke","#888")
        .attr("stroke-dasharray","4")

    const colors = d3.schemeCategory10

    const paths = []

    vecs.slice(0,k).forEach((vec,i)=>{

        const group = svg.append("g")

        // segments
        const line = d3.line()
            .x((d,j)=>x(j))
            .y(d=>y(d))

        const path = group.append("path")
            .datum(vec)
            .attr("fill","none")
            .attr("stroke",colors[i])
            .attr("stroke-width",2)
            .attr("opacity",0.8)
            .attr("d",line)

        // points
        group.selectAll("circle")
            .data(vec)
            .enter()
            .append("circle")
            .attr("cx",(d,j)=>x(j))
            .attr("cy",d=>y(d))
            .attr("r",3)
            .attr("fill",colors[i])

        paths.push(group)

        // legend
        legend.append("span")
            .text(`v${i+1}`)
            .style("color",colors[i])
            .style("cursor","pointer")
            .style("font-weight","600")
            .on("click",()=>{

                paths.forEach((g,j)=>{

                    if(j===i){

                        g.select("path")
                            .attr("stroke-width",4)
                            .attr("opacity",1)

                        g.selectAll("circle")
                            .attr("r",5)

                    }else{

                        g.select("path")
                            .attr("stroke-width",1)
                            .attr("opacity",0.15)

                        g.selectAll("circle")
                            .attr("r",2)

                    }

                })

            })

    })

}

function draw_eigenvector_heatmap(vecs){

    const width = 240
    const height = 320
    const cell = 25

    const container = d3.select("#eigenvector-heatmap")
        .html("")

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)

    const k = Math.min(4, vecs.length)
    const n = vecs[0].length

    const data = []

    for(let j=0;j<k;j++){
        for(let i=0;i<n;i++){
            data.push({
                vertex: i,
                vector: j,
                value: vecs[j][i]
            })
        }
    }

    const flat = data.map(d=>d.value)

    const color = d3.scaleDiverging()
        .domain([
            d3.min(flat),
            0,
            d3.max(flat)
        ])
        .interpolator(d3.interpolateRdBu)

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d=>d.vector * cell + 60)
        .attr("y", d=>d.vertex * cell + 20)
        .attr("width", cell)
        .attr("height", cell)
        .attr("fill", d=>color(d.value))

    // labels eigenvectors
    svg.selectAll(".vlabel")
        .data(d3.range(k))
        .enter()
        .append("text")
        .attr("x", d=>d*cell + 70)
        .attr("y", 15)
        .text(d=>"v"+(d+1))
        .style("font-size","12px")

    // vertex labels
    svg.selectAll(".nlabel")
        .data(d3.range(n))
        .enter()
        .append("text")
        .attr("x", 40)
        .attr("y", d=>d*cell + 35)
        .text(d=>d)
        .style("font-size","12px")
}

function draw_cheeger_demo(graph, fiedler){
    let marker

    const formula = d3.select("#cheeger-formula")
    const value_div = d3.select("#cheeger-value")

    const nodes = graph.nodes
    const edges = graph.edges
    const n = nodes.length

    const order = d3.range(n)
        .sort((a,b)=>fiedler[a]-fiedler[b])

    const slider = d3.select("#cheeger-slider")
        .attr("min",1)
        .attr("max",n-1)
        .attr("value",Math.floor(n/2))

    function conductance_terms(k){

        const S = new Set(order.slice(0,k))

        let cut = 0
        let volS = 0
        let volSc = 0

        edges.forEach(e=>{

            const u = e.source
            const v = e.target
            const w = e.weight ?? 1

            if(S.has(u) && !S.has(v)) cut += w
            if(S.has(v) && !S.has(u)) cut += w

            if(S.has(u)) volS += w
            else volSc += w

            if(S.has(v)) volS += w
            else volSc += w

        })

        const denom = Math.min(volS, volSc)
        const phi = denom === 0 ? 0 : cut / denom

        return {cut, volS, volSc, phi}
    }

    const values = d3.range(1,n).map(k=>{
        const r = conductance_terms(k)
        return {k:k, phi:r.phi}
    })


    draw_curve(values)

    function update(k){

        const res = conductance_terms(k)
        const S = order.slice(0,k)

        value_div.text(`φ(S) = ${res.phi.toFixed(3)}`)

        d3.select("#cheeger-def").html(`
            \\[
            \\phi(S)=
            \\frac{\\text{cut}(S,\\overline{S})}
            {\\min(\\mathrm{vol}(S),\\mathrm{vol}(\\overline{S}))}
            \\]
        `)

        d3.select("#cheeger-set").html(`
            <b>Sweep set</b><br>
            \\[
            S = \\{ ${S.join(", ")} \\}
            \\]
        `)

        d3.select("#cheeger-terms").html(`
            <b>Cut and volumes</b><br>
            \\[
            \\text{cut}(S,\\overline{S}) = ${res.cut.toFixed(2)}
            \\]
            \\[
            \\mathrm{vol}(S) = ${res.volS.toFixed(2)}
            \\]
            \\[
            \\mathrm{vol}(\\overline{S}) = ${res.volSc.toFixed(2)}
            \\]
        `)

        d3.select("#cheeger-result").html(`
            \\[
            \\phi(S)=
            \\frac{${res.cut.toFixed(2)}}
            {\\min(${res.volS.toFixed(2)},${res.volSc.toFixed(2)})}
            =
            ${res.phi.toFixed(3)}
            \\]
        `)

        MathJax.typesetPromise()

        draw_graph(k)
        update_curve_marker(k,res.phi)
    }

    function draw_graph(k){

        const S = new Set(order.slice(0,k))

        const svg = d3.select("#cheeger-graph")
        svg.selectAll("*").remove()

        const x = d3.scaleLinear()
            .domain(d3.extent(nodes,d=>d.x))
            .range([40,280])

        const y = d3.scaleLinear()
            .domain(d3.extent(nodes,d=>d.y))
            .range([200,40])

        svg.selectAll("line")
            .data(edges)
            .enter()
            .append("line")
            .attr("x1",d=>x(nodes[d.source].x))
            .attr("y1",d=>y(nodes[d.source].y))
            .attr("x2",d=>x(nodes[d.target].x))
            .attr("y2",d=>y(nodes[d.target].y))
            .attr("stroke",d=>{
                const u = d.source
                const v = d.target
                return (S.has(u) && !S.has(v)) || (S.has(v) && !S.has(u))
                    ? "#e74c3c"
                    : "#bbb"
            })
            .attr("stroke-width",d=>2*(d.weight ?? 1))

        svg.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx",d=>x(d.x))
            .attr("cy",d=>y(d.y))
            .attr("r",7)
            .attr("fill",(d,i)=>S.has(i) ? "#e74c3c" : "#3498db")
    }

    function draw_curve(values){

        const svg = d3.select("#cheeger-curve")
        svg.selectAll("*").remove()

        const x = d3.scaleLinear()
            .domain([1,n-1])
            .range([40,280])

        const y = d3.scaleLinear()
            .domain([0,d3.max(values,d=>d.phi)])
            .range([160,20])

        svg.append("g")
            .attr("transform","translate(0,160)")
            .call(d3.axisBottom(x))

        svg.append("g")
            .attr("transform","translate(40,0)")
            .call(d3.axisLeft(y))

        const line = d3.line()
            .x(d=>x(d.k))
            .y(d=>y(d.phi))

        svg.append("path")
            .datum(values)
            .attr("fill","none")
            .attr("stroke","#2c7fb8")
            .attr("stroke-width",2)
            .attr("d",line)

        marker = svg.append("circle")
            .attr("r",5)
            .attr("fill","#e74c3c")

        slider.on("input",function(){
            update(+this.value)
        })
    }

    function update_curve_marker(k,phi){

        const svg = d3.select("#cheeger-curve")

        const x = d3.scaleLinear()
            .domain([1,n-1])
            .range([40,280])

        const y = d3.scaleLinear()
            .domain([0,d3.max(values,d=>d.phi)])
            .range([160,20])

        marker
            .attr("cx",x(k))
            .attr("cy",y(phi))
    }

    update(+slider.property("value"))
}
