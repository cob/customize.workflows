import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.5.0/+esm'
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.1.2/+esm'

const toText = (classes) => {
    if (Array.isArray(classes)){
        return classes.join(" ")
    } else if (classes) {
        return classes
    } else {
        return ""
    }
}

export default async function embedMermaid(bpid, stateDef, stateField, targetElement,
                 activeState,  linkClasses=['ml-3.5'], mermaidClasses=['!ml-3.5'], errorClasses=["text-red-900", "ml-3.5"]) {

    const showError = (message) => targetElement.append(`<div class="${toText(errorClasses)}">${message}</div>`)

    try {
        await catchAll(bpid, stateDef, stateField, targetElement, activeState, showError, linkClasses, mermaidClasses)
    } catch (e) {
        showError("Something went wrong")
        showError(e)
    }
}

async function catchAll(bpid, stateDef, stateField, targetElement, activeState, showError,linkClasses, mermaidClasses) {

    let diagram = [
        { type: 'header', v: 'stateDiagram-v2' }, 
        { type: 'style', v: 'classDef RPA         color:#99c240, padding:0px 3px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef Wait        color:#99c240, padding:0px 3px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef Human       color:#1e80ba, padding:0px 5px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef AI          color:#d15802, padding:0px 4px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px' },
        { type: 'style', v: 'classDef BgDimGreen  fill:#C1FA77' },
        { type: 'style', v: 'classDef BgDimOrange fill:#FFE0D2' },
        { type: 'style', v: 'classDef BgDimRed    fill:lightpink' },
        { type: 'style', v: 'classDef Green       color:green,fill:white' },
        { type: 'style', v: 'classDef Red         color:red,fill:white' },
        { type: 'style', v: 'classDef Gray        color:gray,fill:white' },
        { type: 'style', v: 'classDef Orange      color:#9f6700,fill:#fffaec' },
        { type: 'style', v: 'classDef Highlighted stroke:red,stroke-width:3px' },
    ];

    let totalCount = {}

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

        diagram.push({ type: 'state', v: `${idx} : ${state}`, id: idx });
        console.log("diagram", i, idx, state)
        const stateColor = statesColors?.find(c => c.state == state) || "none";

        if(activeState && state == activeState)
            diagram.push({ type: 'stateColor', v: `class ${idx} Highlighted `})
        
        if (stateColor ) 
            diagram.push({ type: 'stateColor', v: `class ${idx} ${stateColor.color}` });

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

        const startStateIdx = states.findIndex(s => s == startState);
        if (startStateIdx < 0) 
            showError(`Cannot find state "${startState}", in "launch" condition of work queue code:${wq['code']}`)
        
        // identificar estado final
        const mudaEstadoRE = new RegExp(`^updates\\[["']${stateField}["']\\]\\s*=\\s*["']([^"']+)["']`);
        const detectaMudaEstadoRE = /\s*data\.value\(["'](.*)['"]\)\s*==\s*["']([^"']+)['"]/;
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

                    const matchFrom = detectaMudaEstadoRE.exec(matchIf[1]);
                    if (matchFrom) {
                        decisionName = "" + matchFrom[1] + ' = ' + matchFrom[2] + "";
                    } else {
                        showError(`Error while parsing condition at line ${i+1} in "on done" of work queue code:${wq['code']}`)
                        window.console.error("não consegui extrair de " + matchIf[1]);
                        decisionName = "FALTA";
                    }
                } else if(endState){
                    // An undefined endState means that it is likely a join
                    showError(`Error while parsing "on done" condition at line ${i+1} in work queue code:${wq['code']}`)
                    window.console.error('não percebo a linha', on_done);
                }
            }

            let endStateIdx = states.findIndex(s => s == endState);
            if (endStateIdx < 0 && endState) 
                showError(`Cannot find state "${endState}", in on done condition of work queue code:${wq['code']}`)

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


    if(!activeState) 
        await Promise.all(wqs.map( wq => {    
            const name = wq['name'][0];
        
            // Contar items desta queue
            const wiQuery = `work_queue:${wq['id']} (-state.raw:Done) (-state.raw:Error) (-state.raw:Canceled)`;
            return axios.get(
                `/recordm/recordm/definitions/search?def=Work Item&size=0&q=${wiQuery}`
            ).then(r => r.data.hits.total.value ).then( total => totalCount[name] = total).catch( error => console.error("count", error))
        }))

    

    


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
        const amount = totalCount[t.name] > 0 ? ` ${totalCount[t.name]}`: ""
        const desc = `<div class="${t.agent}"><span><i class="fa-solid ${icons[t.agent]}"></i>${amount}</span> ${t.name}</div>`;
        t.v = `${t.from} --> ${t.to}: ${desc}`;
        t.clean = `${t.from} --> ${t.to}: ${t.name}`
    });


    console.log("diagram", diagram)

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

    // Work Queues
    targetElement
        .append(`<a href="${normalLink}" class="${toText(linkClasses)}" target="_blank" onclick="if(event.altKey || event.metaKey) { event.preventDefault(); window.open('${cleanLink}', '_blank'); }">Mermaid link</a>`)
        // .append(`<a href="${mermaidLink}" class="${toText(linkClasses)}" style="margin:0px 14px;" target=_blank>Editor Mermaid</a>`)
        .append(`<pre class="mermaid ${toText(mermaidClasses)}">` + mermaidSrc + '</pre>')

    if(targetElement.is(':visible')){        
        mermaid.initialize({ startOnLoad: false });
        setTimeout(() => mermaid.init(), 10);
    }
}


