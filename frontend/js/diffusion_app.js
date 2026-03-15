let data = null

function init_diffusion(){

    wait_for_message("diffusion-update")
    .then(msg => {

        data = msg.data.content

        draw_laplacian_matrix(data.graph)

        draw_all(0)

        draw_phase(0)

        setup_slider()

    })

}


function setup_slider(){

    const slider = document.getElementById("time-slider")

    slider.addEventListener("input",()=>{

        const t = +slider.value

        document.getElementById("time-value").innerText = t

        draw_all(t)

        draw_phase(t)

    })

}


function draw_all(t){

    draw_graph("graph-temp", data.diffusion[t])

    draw_laplacian_graph("graph-lap", t)

}
function draw_laplacian_matrix(graph) {
    const container = d3.select("#laplacian-matrix");
    container.html("");

    // 1. On récupère TOUS les IDs de la structure pour être sûr de ne rien rater
    const houseIds = data.structure.house_nodes;
    const outsideIds = data.structure.outside_nodes;
    
    // On trie les nœuds du graphe en fonction de leur appartenance
    const houseNodes = graph.nodes.filter(n => houseIds.includes(n.id));
    const outsideNodes = graph.nodes.filter(n => outsideIds.includes(n.id));
    
    // On s'assure que même si un nœud n'est pas dans house/outside, il apparaît (sécurité)
    const otherNodes = graph.nodes.filter(n => !houseIds.includes(n.id) && !outsideIds.includes(n.id));

    const sortedNodes = [...houseNodes, ...outsideNodes, ...otherNodes];
    const sortedIds = sortedNodes.map(n => n.id);

    const L_raw = compute_laplacian_matrix(graph);

    const table = container.append("table")
        .style("border-collapse", "collapse")
        .style("table-layout", "fixed") 
        .style("margin", "auto");

    // Header
    const header = table.append("tr");
    header.append("th").style("width", "85px");
    sortedNodes.forEach(n => {
        header.append("th")
            .style("width", "45px")
            .style("font-size", "9px") // Un peu plus petit pour caler les noms longs
            .style("padding", "5px 2px")
            .text(n.name || n.id);
    });

    // Lignes
    sortedIds.forEach((id_i, i) => {
        const row = table.append("tr");
        
        row.append("td")
            .style("font-weight", "600")
            .style("font-size", "11px")
            .style("padding", "0 10px")
            .style("text-align", "right")
            .style("background", "#f9f9f9")
            .text(sortedNodes[i].name || id_i);

        sortedIds.forEach((id_j, j) => {
            const val = L_raw[id_i][id_j];
            
            let bgColor = "white";
            if (id_i === id_j) bgColor = "#ffeaa7";
            else if (val < 0) bgColor = "#fab1a0";

            const cell = row.append("td")
                .style("border", "1px solid #dfe6e9")
                .style("width", "45px")
                .style("height", "45px")
                .style("text-align", "center")
                .style("font-family", "monospace")
                .style("background-color", bgColor)
                .text(val === 0 ? "" : val);

            // Délimitation visuelle du bloc "House"
            const isLastHouse = (i === houseNodes.length - 1);
            const isLastHouseCol = (j === houseNodes.length - 1);

            if (isLastHouse) cell.style("border-bottom", "2px solid #2d3436");
            if (isLastHouseCol) cell.style("border-right", "2px solid #2d3436");
        });
    });
}
function compute_laplacian_matrix(graph){

    const n = graph.nodes.length

    const A = Array.from({length:n},()=>Array(n).fill(0))

    const seen = new Set()

    graph.edges.forEach(e=>{

        const i = Math.min(e.source,e.target)
        const j = Math.max(e.source,e.target)

        const key = `${i}-${j}`

        if(seen.has(key)) return

        seen.add(key)

        A[i][j] = 1
        A[j][i] = 1

    })

    const L = Array.from({length:n},()=>Array(n).fill(0))

    for(let i=0;i<n;i++){

        let deg = 0

        for(let j=0;j<n;j++) deg += A[i][j]

        for(let j=0;j<n;j++){

            if(i===j) L[i][j] = deg
            else L[i][j] = -A[i][j]

        }

    }

    return L

}


function laplacian_times_temperature(L,T){

    const n = T.length

    const LT = new Array(n).fill(0)

    for(let i=0;i<n;i++){

        for(let j=0;j<n;j++){

            LT[i] += L[i][j]*T[j]

        }

    }

    return LT

}


function draw_laplacian_graph(container,t){

    const graph = data.graph

    const T = data.diffusion[t]

    const L = compute_laplacian_matrix(graph)

    const LT = laplacian_times_temperature(L, T).map(v => -v * 0.1); // alpha = 0.1

    const width = 420
    const height = 320

    const svg = d3.select("#"+container)
        .html("")
        .append("svg")
        .attr("width",width)
        .attr("height",height)

    const x = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.x))
        .range([40,width-40])

    const y = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.y))
        .range([height-40,40])

    const maxL = d3.max(LT.map(Math.abs))

    const color = d3.scaleDiverging(
        t=>d3.interpolateRdBu(1-t)
    ).domain([-maxL,0,maxL])

    svg.selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attr("x1",d=>x(graph.nodes[d.source].x))
        .attr("y1",d=>y(graph.nodes[d.source].y))
        .attr("x2",d=>x(graph.nodes[d.target].x))
        .attr("y2",d=>y(graph.nodes[d.target].y))
        .attr("stroke","#bbb")

    const nodes = svg.selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g")
        .attr("transform",d=>`translate(${x(d.x)},${y(d.y)})`)

    nodes.append("circle")
        .attr("r",11)
        .attr("fill",(d,i)=>color(LT[i]))
        .attr("stroke","black")

    nodes.append("text")
        .attr("y",-14)
        .attr("text-anchor","middle")
        .text(d=>d.name ?? d.id)

    nodes.append("text")
        .attr("y",20)
        .attr("text-anchor","middle")
        .text((d,i)=>LT[i].toFixed(2))

}


function draw_graph(container,values){

    const graph = data.graph

    const width = 420
    const height = 320

    const svg = d3.select("#"+container)
        .html("")
        .append("svg")
        .attr("width",width)
        .attr("height",height)

    const x = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.x))
        .range([40,width-40])

    const y = d3.scaleLinear()
        .domain(d3.extent(graph.nodes,d=>d.y))
        .range([height-40,40])

    const color = d3.scaleDiverging(
        t => d3.interpolateRdBu(1 - t)
    ).domain([-2,0,30])

    svg.selectAll("line")
        .data(graph.edges)
        .enter()
        .append("line")
        .attr("x1",d=>x(graph.nodes[d.source].x))
        .attr("y1",d=>y(graph.nodes[d.source].y))
        .attr("x2",d=>x(graph.nodes[d.target].x))
        .attr("y2",d=>y(graph.nodes[d.target].y))
        .attr("stroke","#aaa")

    const nodes = svg.selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g")
        .attr("transform",d=>`translate(${x(d.x)},${y(d.y)})`)

    nodes.append("circle")
        .attr("r",10)
        .attr("fill",(d,i)=>color(values[i]))

    nodes.append("text")
        .attr("y",-14)
        .attr("text-anchor","middle")
        .text(d=>d.name ?? d.id)

    nodes.append("text")
        .attr("y",20)
        .attr("text-anchor","middle")
        .text((d,i)=>values[i].toFixed(2))

}
function project_state(T) {
    const house = data.structure.house_nodes;
    const outside = data.structure.outside_nodes;

    const Th = d3.mean(house.map(i => T[i]));
    const To = d3.mean(outside.map(i => T[i]));

    return [Th, To];
}

function draw_vector_field(svg, x, y) {
    const [xmin, xmax] = x.domain();
    const [ymin, ymax] = y.domain();
    const steps = 15;
    const xStep = (xmax - xmin) / steps;
    const yStep = (ymax - ymin) / steps;

    const A = data.graph.adjacency;
    const house = data.structure.house_nodes;
    const outside = data.structure.outside_nodes;
    const n = data.graph.nodes.length;

    const arrows = [];

    for (let cx = xmin; cx <= xmax; cx += xStep) {
        for (let cy = ymin; cy <= ymax; cy += yStep) {

            // 1. Reconstruction de l'état T
            const T = new Array(n);
            for(let i=0; i<n; i++) {
                T[i] = house.includes(i) ? cx : cy;
            }

            // 2. Calcul du changement (Laplacien pur uniquement)
            const dT = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (A[i][j] !== 0) {
                        dT[i] += A[i][j] * (T[j] - T[i]);
                    }
                }
            }

            // 3. Projection du champ
            const dx = d3.mean(house.map(i => dT[i]));
            const dy = d3.mean(outside.map(i => dT[i]));

            const norm = Math.sqrt(dx * dx + dy * dy);
            if (norm < 1e-6) continue;

            const scale = xStep * 0.7;

            arrows.push({
                x1: x(cx),
                y1: y(cy),
                x2: x(cx + (dx / norm) * scale),
                y2: y(cy + (dy / norm) * scale)
            });
        }
    }

    // 4. Rendu SVG du Vector Field
    svg.selectAll(".vf").remove();
    svg.selectAll(".vf")
        .data(arrows)
        .enter()
        .append("line")
        .attr("class", "vf")
        .attr("x1", d => d.x1)
        .attr("y1", d => d.y1)
        .attr("x2", d => d.x2)
        .attr("y2", d => d.y2)
        .style("stroke", "#b2bec3") // Gris clair propre
        .style("stroke-width", "1.2px")
        .style("opacity", 0.7)
        .attr("marker-end", "url(#arrow)");
}

function draw_trajectory(svg, x, y, t) {
    const states = data.diffusion
        .slice(0, t + 1)
        .map(T => project_state(T));

    const line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1]));

    svg.selectAll(".traj").remove();
    svg.append("path")
        .datum(states)
        .attr("class", "traj")
        .attr("fill", "none")
        .attr("stroke", "#0984e3") // Bleu moderne
        .attr("stroke-width", 3.5)
        .attr("d", line);
}

function draw_phase(t = 0) {
    const width = 420;
    const height = 320;
    const pad = 60;

    const svg = d3.select("#phase")
        .html("")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const temps = data.diffusion.flat();
    const domain = [
        d3.min(temps) - 2,
        d3.max(temps) + 2
    ];

    const x = d3.scaleLinear().domain(domain).range([pad, width - pad]);
    const y = d3.scaleLinear().domain(domain).range([height - pad, pad]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - pad})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${pad},0)`)
        .call(d3.axisLeft(y));

    // Marker pour les flèches
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#b2bec3");

    // Labels des axes
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 15)
        .attr("text-anchor", "middle")
        .text("average temperature inside house");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text("average temperature outside");

    // --- 1. DESSINER LE CHAMP DE VECTEURS ---
    draw_vector_field(svg, x, y);

    // --- 2. DESSINER L'AXE D'ÉQUILIBRE (VECTEUR PROPRE λ=0) ---
    const eq = project_state(data.diffusion[data.diffusion.length - 1]);

    const v1 = data.spectral.eigenvectors[0];
    const p_v = project_state(v1);

    if (Math.abs(p_v[0]) > 1e-6) {
        const slope = p_v[1] / p_v[0]; // Pour la diffusion pure, sera = 1
        const x1_val = domain[0], x2_val = domain[1];
        const y1_val = eq[1] + slope * (x1_val - eq[0]);
        const y2_val = eq[1] + slope * (x2_val - eq[0]);

        svg.append("line")
            .attr("x1", x(x1_val))
            .attr("y1", y(y1_val))
            .attr("x2", x(x2_val))
            .attr("y2", y(y2_val))
            .attr("stroke", "#d63031")
            .attr("stroke-dasharray", "6,4")
            .attr("opacity", 0.6)
            .attr("stroke-width", 2);
    }

    // --- 3. DESSINER LA TRAJECTOIRE ---
    draw_trajectory(svg, x, y, t);


// --- 5. LÉGENDE ---
    const legend = svg.append("g")
        .attr("transform", "translate(240, 15)"); // Un peu plus bas pour respirer

    // 1. Dynamics (Le champ de vecteurs)
    legend.append("line")
        .attr("x1", 0).attr("x2", 25)
        .attr("y1", 0).attr("y2", 0)
        .attr("stroke", "#b2bec3")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", 35).attr("y", 5)
        .text("dynamics")
        .style("font-size", "12px")
        .style("fill", "#636e72");

    // 2. Simulation (La trajectoire bleue)
    legend.append("line")
        .attr("x1", 0).attr("x2", 25)
        .attr("y1", 20).attr("y2", 20)
        .attr("stroke", "#0984e3")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", 35).attr("y", 25)
        .text("simulation")
        .style("font-size", "12px")
        .style("fill", "#636e72");

    // 3. Equilibrium Line (L'axe stationnaire λ = 0)
    legend.append("line")
        .attr("x1", 0).attr("x2", 25)
        .attr("y1", 40).attr("y2", 40)
        .attr("stroke", "#d63031")
        .attr("stroke-dasharray", "4,2")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", 35).attr("y", 45)
        .text("equilibrium (λ = 0)")
        .style("font-size", "12px")
        .style("fill", "#636e72");

}