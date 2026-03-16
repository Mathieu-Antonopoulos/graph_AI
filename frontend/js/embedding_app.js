let current_data = null;

/**
 * INITIALISATION
 */
async function init_app() {
    const slider = document.getElementById("weight-slider");
    const weightVal = document.getElementById("weight-value");

    slider.addEventListener("input", () => {
        const w = parseFloat(slider.value);
        weightVal.innerText = w.toFixed(2);
        send_message("set-weight", w);
    });

    while (true) {
        const msg = await wait_for_message("embedding-update");
        if (msg) {
            render(msg.data.content);
        }
    }
}

/**
 * RENDER PRINCIPAL
 */
function render(data) {
    current_data = data;
    const embedding = data.spectral.embedding;

    // 1. Calcul des angles bruts
    const angles = embedding.map(d => Math.atan2(d[1], d[0]));

    // 2. RECALAGE DE PHASE "SANS SAUT"
    // On cherche l'angle moyen (direction principale) pour centrer le sweep
    let sumX = 0, sumY = 0;
    angles.forEach(a => { sumX += Math.cos(a); sumY += Math.sin(a); });
    const meanAngle = Math.atan2(sumY, sumX);

    // On décale tout pour que la "coupure" de la règle soit à l'opposé de la masse
    // Cela garantit que les clusters (0, 1, 2) restent groupés au centre de la règle
    const shift = meanAngle - Math.PI; 
    const relativeAngles = angles.map(a => {
        let rel = a - shift;
        while (rel < 0) rel += 2 * Math.PI;
        while (rel >= 2 * Math.PI) rel -= 2 * Math.PI;
        return rel;
    });

    // 3. ORDRE UNIQUE (Trié par angle relatif)
    const currentOrder = d3.range(embedding.length).sort((a, b) => relativeAngles[a] - relativeAngles[b]);

    draw_cheeger_demo(data.graph, embedding, currentOrder, relativeAngles);
}

/**
 * CONTRÔLEUR CHEEGER
 */
function draw_cheeger_demo(graph, embedding, order, relativeAngles) {
    const n = graph.nodes.length;
    const slider = d3.select("#cheeger-slider").attr("min", 1).attr("max", n - 1);

    if (!slider.property("value")) slider.property("value", Math.floor(n/2));
    
    function update_all_views(k) {
        if (!current_data) return;

        const S_set = new Set(order.slice(0, k));

        draw_graph_with_sweep(current_data.graph, S_set);
        draw_spectral_embedding(embedding, S_set);
        draw_radial_ordering(embedding, relativeAngles, S_set);

        d3.select("#cheeger-min-k").text(k);
    }

    slider.on("input", function() { update_all_views(+this.value); });
    update_all_views(+slider.property("value"));
}

/**
 * 1. GRAPHE PHYSIQUE
 */
function draw_graph_with_sweep(graph, S_set) {
    const width = 320, height = 280, pad = 30;
    const container = d3.select("#graph").html("");
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const x = d3.scaleLinear().domain(d3.extent(graph.nodes, d => d.x)).range([pad, width - pad]);
    const y = d3.scaleLinear().domain(d3.extent(graph.nodes, d => d.y)).range([height - pad, pad]);

    svg.selectAll("line").data(graph.edges).enter().append("line")
        .attr("x1", d => x(graph.nodes[d.source].x)).attr("y1", d => y(graph.nodes[d.source].y))
        .attr("x2", d => x(graph.nodes[d.target].x)).attr("y2", d => y(graph.nodes[d.target].y))
        .attr("stroke", d => S_set.has(d.source) !== S_set.has(d.target) ? "#e74c3c" : "#dfe6e9")
        .attr("stroke-width", d => S_set.has(d.source) !== S_set.has(d.target) ? 3 : 1.5)
        .attr("stroke-dasharray", d => S_set.has(d.source) !== S_set.has(d.target) ? "4,2" : "none");

    svg.selectAll("circle").data(graph.nodes).enter().append("circle")
        .attr("cx", d => x(d.x)).attr("cy", d => y(d.y)).attr("r", 7)
        .attr("fill", (d, i) => S_set.has(i) ? "#e74c3c" : "#3498db")
        .attr("stroke", "#fff").attr("stroke-width", 2);
}

/**
 * 2. EMBEDDING SPECTRAL
 */
function draw_spectral_embedding(points, S_set) {
    const width = 320, height = 280, pad = 40;
    const container = d3.select("#embedding").html("");
    const svg = container.append("svg").attr("width", width).attr("height", height);

    // Domaines fixés pour stabiliser la vue lors des updates
    const x = d3.scaleLinear().domain([-0.5, 0.5]).range([pad, width - pad]);
    const y = d3.scaleLinear().domain([-0.5, 0.5]).range([height - pad, pad]);

    // 1. Cercles de niveau de Masse (Contours concentriques)
    const massLevels = [0.1, 0.2, 0.3, 0.4];
    massLevels.forEach(m => {
        svg.append("circle")
            .attr("cx", x(0)).attr("cy", y(0))
            .attr("r", x(m) - x(0))
            .attr("fill", "none")
            .attr("stroke", "#c7c7c7ff")
            .attr("stroke-width", 1);
        
        // Petit indicateur de valeur sur l'axe
        svg.append("text")
            .attr("x", x(m)).attr("y", y(0) + 12)
            .attr("font-size", "8px").attr("fill", "#7b7b7bff").attr("text-anchor", "middle")
            .text(m);
    });

    // 2. Axe de la Masse (Ligne radiale de référence)
    svg.append("line")
        .attr("x1", x(0)).attr("y1", y(0))
        .attr("x2", x(0.45)).attr("y2", y(0))
        .attr("stroke", "#7b7b7bff").attr("stroke-dasharray", "2,2");
    
    svg.append("text")
        .attr("x", x(0.45)).attr("y", y(0) - 5)
        .attr("font-size", "9px").attr("fill", "#7b7b7bff").attr("text-anchor", "end")
        .text("Mass (r)");

    // 3. Dessin des nœuds
    svg.selectAll("circle.node")
        .data(points)
        .enter().append("circle")
        .attr("class", "node")
        .attr("cx", d => x(d[0]))
        .attr("cy", d => y(d[1]))
        // Taille proportionnelle à la masse r = sqrt(v2^2 + v3^2)
        .attr("r", d => 4 + Math.sqrt(d[0]**2 + d[1]**2) * 20)
        .attr("fill", (d, i) => S_set.has(i) ? "#e74c3c" : "#3498db")
        .attr("fill-opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

    // Centre (Origine)
    svg.append("circle").attr("cx", x(0)).attr("cy", y(0)).attr("r", 2).attr("fill", "#7b7b7bff");
}

/**
 * 3. RADIAL ORDERING (Axe X = Angle recalé, Axe Y = Masse)
 */
function draw_radial_ordering(embedding, relativeAngles, S_set) {
    const container = d3.select("#fiedler-line");
    if (container.empty()) return;
    container.html(""); 

    const data = embedding.map((d, i) => ({
        id: i,
        relAngle: relativeAngles[i],
        radius: Math.sqrt(d[0]**2 + d[1]**2)
    }));

    const width = container.node().clientWidth || 800;
    const height = 150, padX = 80;
    const svg = container.append("svg").attr("width", width).attr("height", height);

    // X de 0 à 2PI
    const x = d3.scaleLinear().domain([0, 2 * Math.PI]).range([padX, width - padX]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.radius) * 1.2]).range([height - 40, 20]);

    svg.append("line").attr("x1", padX).attr("x2", width - padX).attr("y1", height - 30).attr("y2", height - 30).attr("stroke", "#eee");

    svg.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => x(d.relAngle)).attr("cy", d => y(d.radius)).attr("r", 9)
        .attr("fill", d => S_set.has(d.id) ? "#e74c3c" : "#3498db")
        .attr("stroke", "white").attr("stroke-width", 2);

    svg.selectAll("text").data(data).enter().append("text")
        .attr("x", d => x(d.relAngle)).attr("y", d => y(d.radius) - 16)
        .attr("text-anchor", "middle").text(d => d.id).style("font-size", "12px").style("font-weight", "bold");
}
