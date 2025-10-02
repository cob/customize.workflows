
let mermaid = null;

(async () => {
  try {
    const module = await import("https://cdn.jsdelivr.net/npm/mermaid@10.5.0/+esm");
    mermaid = module.default; // mermaid is usually exported as default
  } catch (err) {
    console.warn("Mermaid failed to load, continuing without it.", err);
  }
})();

const toText = (classes) => {
    if (Array.isArray(classes)){
        return classes.join(" ")
    } else if (classes) {
        return classes
    } else {
        return ""
    }
}

export const CLASS_OPTIONS= [
                "BgRed",
                "BgGreen",
                "BgBlue",
                "BgOrange",
                "BgGray",
                "BgDimRed",
                "BgDimGreen",
                "BgDimBlue",
                "BgDimOrange",
                "BgDimGray",
                "DimGreen",
                "DimRed",
                "DimOrange",
                "DimGray",
                "Red",
                "Green",
                "Blue",
                "Orange",
                "Gray"
            ]

export default function embedMermaid(bpid, stateDef, stateField, targetElement,
    {activeState = undefined, linkClasses ='ml-3.5', mermaidClasses='!ml-3.5', errorClasses="text-red-900 ml-3.5", linkToBP = true} = {}) {
        const showError = (message) => targetElement.append(`<div class="${toText(errorClasses)}">${message}</div>`)

    try {
        if(mermaid) {
            return catchAll(bpid, stateDef, stateField, targetElement, activeState, showError, linkClasses, mermaidClasses, linkToBP)
        } else {
            showError("Mermaid not loaded")
        }
    } catch (e) {
        showError("Something went wrong")
        showError(e)
    }
}

async function catchAll(bpid, stateDef, stateField, targetElement, activeState, showError,linkClasses, mermaidClasses, linkToBP) {

    let diagram = [
        { type: 'header', v: 'stateDiagram-v2' }, 
        { type: 'style', v: 'classDef RPA         color:#99c240, padding:0px 3px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef Wait        color:#99c240, padding:0px 3px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef Human       color:#1e80ba, padding:0px 5px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef AI          color:#d15802, padding:0px 4px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        
        { type: 'style', v: 'classDef BgRed  fill:red' },
        { type: 'style', v: 'classDef BgGreen fill:green' },
        { type: 'style', v: 'classDef BgBlue    fill:blue' },
        { type: 'style', v: 'classDef BgOrange    fill:orange' },
        { type: 'style', v: 'classDef BgGray    fill:gray' },
        { type: 'style', v: 'classDef BgDimRed    fill:#ffb6c1' },
        { type: 'style', v: 'classDef BgDimGreen    fill:#C1FA77' },
        { type: 'style', v: 'classDef BgDimBlue    fill:#def4f9' },
        { type: 'style', v: 'classDef BgDimOrange    fill:#FFE0D2' },
        { type: 'style', v: 'classDef BgDimGray    fill:#bebebe' },

        { type: 'style', v: 'classDef DimGreen       color:#9c9,fill:white' },
        { type: 'style', v: 'classDef DimRed       color:#fbb,fill:white' },
        { type: 'style', v: 'classDef DimOrange       color:#ffdebb,fill:white' },
        { type: 'style', v: 'classDef DimGray       color:#bebebe,fill:white' },
        { type: 'style', v: 'classDef Red       color:red,fill:white' },
        { type: 'style', v: 'classDef Green       color:green,fill:white' },
        { type: 'style', v: 'classDef Blue       color:blue,fill:white' },
        { type: 'style', v: 'classDef Orange       color:orange,fill:white' },
        { type: 'style', v: 'classDef Gray         color:gray,fill:white' },
        
        { type: 'style', v: 'classDef Highlighted stroke:red,stroke-width:3px' },
    ];

    let queueData = {}

    // ************
    //   Estados
    // ************


    // obter estados possíveis
    const specificDataDef = await axios.get(`/recordm/recordm/definitions/name/${stateDef}`)
        .then( resp => resp.data )
        .catch( _ => showError(`Definition "${stateDef}" does not exist!`) )

    if(!specificDataDef.fieldDefinitions)
        return
    // window.console.debug('JN', specificDataDef)
    const stateFieldDef = specificDataDef.fieldDefinitions.find(fd => fd.name == stateField);



    if(!stateFieldDef) {
        showError(`Field "${stateField}" does not exist in definition "${stateDef}"`)
        return
    }


    // window.console.debug('JN', stateFieldDef)
    const states = stateFieldDef.configuration.keys.Select.args;
    window.console.debug('JN', states);

    const statesColors = stateFieldDef.configuration.extensions.$styleResultColumn
        && stateFieldDef
            .configuration
            .extensions
            .$styleResultColumn
            .args
            .map(c => { const [state, color] = c.split(":"); return ({ state: state, color: color }); });


    window.console.debug('JN', statesColors); 

    const toStateId = (i) => i < 10 ? 's_0' + i : 's_' + i 
    const toDecisionId = (i) => i < 10 ? 'd_0' + i : 'd_' + i 

    for(const [i, state] of states.entries()) {
        const idx = toStateId(i)

        diagram.push({ type: 'state', v: `${idx} : ${state}`, id: idx, name: state });
        const stateColor = statesColors?.find(c => c.state == state) || "none";

        if(activeState && state == activeState)
            diagram.push({ type: 'stateColor', v: `class ${idx} Highlighted `})
        
        const isCustomColor = !CLASS_OPTIONS.includes(stateColor.color)
        const customFlag = isCustomColor ? 'custom-mermaid-block' : ''

        if (stateColor ) 
            diagram.push({ type: 'stateColor', v: `class ${idx} ${stateColor.color} ${customFlag}` });

    };


    // **************
    //   Transições
    // **************
    // obter WQs relevantes
    const wqsQuery = `business_process:${bpid}`;
    const wqs = (await axios.get(
        `/recordm/recordm/definitions/search?def=Work Queues&size=50&sort=code:asc&q=${wqsQuery}`
    )).data.hits.hits.map((hit) => hit._source);

    for(const wq of wqs) {
        const name = wq['name'][0];
        const agent = wq['agent_type'][0];

        if(!wq['launch_condition']) {
            showError(`Work queue code:${wq['code']} does not have a "launch" condition`)
            continue
        } 
        
        if(!wq['on_done']) {
            showError(`Work queue code:${wq['code']} does not have an "on done" condition`)
            continue
        } 
        
        // identificar estado inicial
        const launch_condition = wq['launch_condition'][0];
        const launchMatches = new RegExp(`\\s*msg\\.field\\(["']${stateField}['"]\\)\\.changedTo\\(["']([^"']+)['"]\\)`)
            .exec(launch_condition);

        if(!launchMatches) {
            showError(`Error parsing "launch" condition in work queue code:${wq['code']}`)
            continue
        }

        const startState = launchMatches[1]

        let startStateIdx = states.findIndex(s => s == startState);
        if (startStateIdx < 0) {
            states.push( startState )            
            startStateIdx = states.length - 1
            const diagramID = toStateId(startStateIdx)
            diagram.push({ type: 'state', v: `${diagramID} : ${startState}`, id: diagramID,  name: startState});
        }
        
        // identificar estado final
        const mudaEstadoRE = new RegExp(`^updates\\[["']${stateField}["']\\]\\s*=\\s*["']([^"']+)["']`);
        const linhas = wq['on_done'][0].split('\n');
        const eDecisao = linhas.length > 1;

        if (eDecisao) {
            window.console.debug('JN', 'decisao', linhas);
            diagram.push({ type: 'choice', v: `state ${toDecisionId(startStateIdx)} <<choice>>` });
            if (startStateIdx >= 0) {
                diagram.push({ type: 'transition', from: toStateId(startStateIdx), to: `${toDecisionId(startStateIdx)}`, name: name, agent: agent });
            }
        }

        linhas.forEach((on_done, i) => {

            let endState;
            let decisionName = name;
            const matchSimple = mudaEstadoRE.exec(on_done);
            if (matchSimple) {
                window.console.debug('JN', 'matchSimple', matchSimple);
                endState = matchSimple[1];
            } else {
                const matchIf = /^if\s*\((.*)\s*\)\s*{\s*(.*)\s*}\s*$/.exec(on_done); 
                if (matchIf) {
                    window.console.debug('JN', 'matchesIF', matchIf);
                    const endMatches = mudaEstadoRE.exec(matchIf[2]);                    
                    
                    if(!endMatches) {
                            showError(`Error parsing conditional body at line ${i+1} in "on done" of work queue code:${wq['code']}`)
                            return 
                    }

                    endState = endMatches[1]

                    decisionName = matchIf[1]
                        .replaceAll(/data.value\(["']([^"']*)["']\)/g, "$1")
                        .replaceAll("==", "=")                     

                } else if(endState){
                    // An undefined endState means that it is likely a join
                    showError(`Error while parsing "on done" condition at line ${i+1} in work queue code:${wq['code']}`)
                    window.console.error('não percebo a linha', on_done);
                }
            }

            let endStateIdx = states.findIndex(s => s == endState);
            if (endStateIdx < 0 && endState) {
                states.push(endState)
                endStateIdx = states.length - 1
                const diagramID = toStateId(endStateIdx)
                diagram.push({ type: 'state', v: `${diagramID} : ${endState}`, id: diagramID,  name: endState });
            }

            if (startStateIdx >= 0 && endStateIdx >= 0) {
                if (eDecisao) {
                    diagram.push({ type: 'decision', v: `${toDecisionId(startStateIdx)} --> ${toStateId(endStateIdx)}: ${decisionName}`, to: toStateId(endStateIdx) });

                } else {
                    diagram.push({ type: 'transition', from: toStateId(startStateIdx), to: toStateId(endStateIdx), name: name, agent: agent });
                }
            }

            window.console.debug('JN', 'transition', name, ':', startStateIdx, startState, endStateIdx, endState);
        });
    };




    if(!activeState) {
        const allWIRequests = []

        for(const wq of wqs) {
            const name = wq['name'][0];

            // Contar items desta queue
            const wiQuery = `work_queue:${wq['id']} (-state.raw:Done) (-state.raw:Error) (-state.raw:Canceled)`;
            const promise = axios.get(`/recordm/recordm/definitions/search?def=Work Item&size=0&q=${wiQuery}`)
                .then(r => r.data.hits.total.value )
                .then( total => queueData[name] = { total : total, query : wiQuery })
                .catch( error => console.error("DC count", error))
            allWIRequests.push(promise)
        }
        await Promise.all(allWIRequests)
    }

    // **********************   
    //    Processar Gráfico     
    // **********************   
    // transformar <<choice>> com >1 entradas num <<join>>
    const joins = diagram
        .filter(l => l.type == 'transition' && /d_/.test(l.to))
        .map(l => l.to)
        .reduce((acc, curr) => { if (!acc[curr]) { acc[curr] = 1; } else { acc[curr] = acc[curr] + 1; }; return acc; }, {});

    for (const stateId in joins) {
        if (joins[stateId] > 1) {
            // trocar <<choice>> por <<join>>
            diagram
                .filter(l => l.type == 'choice' && new RegExp(`state ${stateId} `).test(l.v))
                .forEach(l => l.v = l.v.replaceAll('<<choice>>', '<<join>>'));

            // juntar condições que saem do <<join>>
            const outgoingDecisions = diagram
                .filter(l => l.type == 'decision' && new RegExp(`^${stateId} --> `).test(l.v));
            const commonPart = outgoingDecisions[0].v.substring(0, outgoingDecisions[0].v.indexOf(':'));
            const joinedCondition = outgoingDecisions
                .map(l => l.v.substring(commonPart.length + 1))
                .join(" && ");
            window.console.debug('JN', 'choices', 'decisions', `^d_${stateId} --> `, joinedCondition);
            diagram = diagram.filter(l => l.type != 'decision' || !l.v.startsWith(commonPart));
            diagram.push({ type: 'decision', v: `${commonPart}: ${joinedCondition}`, to: outgoingDecisions[0].to });

        }
    }

    // Gerar transições
    const icons = { Human: 'fa-person', RPA: 'fa-robot', AI: 'fa-street-view', Wait: 'fa-clock' };
    diagram.filter(l => l.type == 'transition').forEach(t => {
 
        const amount = queueData[t.name].total > 0 ? ` ${queueData[t.name].total}`: ""
        const desc = `<div class="${t.agent}"><a id="${t.name}"><i class="fa-solid ${icons[t.agent]}"></i>${amount}</a> ${t.name}</div>`;
        t.v = `${t.from} --> ${t.to}: ${desc}`;
        t.clean = `${t.from} --> ${t.to}: ${t.name}`
    });



    // *****************
    //   Gerar Gráfico
    // *****************
    let mermaidSrc = "stateDiagram-v2 \n\n";
    // Adicionar só estilos
    mermaidSrc += diagram.filter(l => l.type == "style").map(l => l.v).join('\n') + "\n\n";
    // Adicionar só cores
    mermaidSrc += diagram.filter(l => l.type == "stateColor").map(l => l.v).join('\n') + "\n\n";
    // Adicionar só estados (mas sem estados não usados)
    mermaidSrc += diagram.filter(l => l.type == "state").filter(s => diagram.find(l => s.id == l.to || s.id == l.from)).map(l => l.v).join('\n') + "\n\n";
    // Adicionar só estados decisões e junções
    mermaidSrc += diagram.filter(l => l.type == "choice").map(l => l.v).join('\n') + "\n\n";
    
    
    let cleanSrc = mermaidSrc 
    
    // Adicionar o resto, transições e decisões
    mermaidSrc += diagram.filter(l => l.type == "transition" || l.type == "decision")
        .map(l => l.v).join('\n');

    // Adicionar o resto, mas a opção so com texto
    cleanSrc += diagram.filter(l => l.type == "transition" || l.type == "decision")
        .map(l => l.type ==  "transition" ? l.clean : l.v).join('\n');

        
    window.console.debug('JN', 'mermaidSrc', mermaidSrc);

    const createLink = (src) => {
        const mermaidStringified = JSON.stringify({ code: src, mermaid: { theme: "default" } });
        const mermaidEncoded = new TextEncoder().encode(mermaidStringified);
        return `https://mermaid.live/edit#base64:${btoa(String.fromCodePoint(...mermaidEncoded))}`;
    }

    const normalLink = createLink(mermaidSrc)
    const cleanLink  = createLink(cleanSrc)

    const bpLink = document.createElement("a")
        bpLink.href      = `/#/instance/${bpid}`
        bpLink.innerHTML = "Business Process"
        bpLink.className = "top-8 left-2 text-sm text-blue-400 absolute"

    const link = document.createElement("a")
        link.href      = normalLink
        link.target    = "_blank"
        link.innerHTML = "Mermaid"
        link.className = linkClasses
        link.onclick   = (event) => { if(event.altKey || event.metaKey){ event.preventDefault(); window.open(cleanLink, '_blank'); }}

    const merElem = document.createElement("div")
        merElem.classList = "mermaid text-center " + mermaidClasses


    if(linkToBP)
        targetElement.append(link, bpLink, merElem)
    else 
        targetElement.append(link, merElem)

    
    mermaid.initialize({ startOnLoad: false })
    const {svg } = await mermaid.render('mermaid', mermaidSrc)
    
    merElem.innerHTML = svg
    
    const defId = (await axios.get(`/recordm/recordm/definitions/search?def=Work Item&size=1&q=*`)).data.hits.hits[0]._source.definitionId
    merElem.querySelectorAll("a").forEach( elem => elem.id in queueData ? elem.href = `/#/definitions/${defId}/q=${queueData[elem.id].query}` : "")
    
    const usedStateNames = diagram.filter(l => l.type == "state").filter(s => diagram.find(l => s.id == l.to || s.id == l.from)).map(l => l.name) ?? []
    const unusedStateNames = diagram.filter(l => l.type == "state").filter(s => diagram.find(l => s.id == l.to || s.id == l.from) == undefined).map(l => l.name) ?? []
    const colors = statesColors?.reduce( (p, curr) => { p[curr.state] = curr.color; return p }, {}) ?? {}
    return {
        usedStateNames,
        unusedStateNames,
        colors
    }

}