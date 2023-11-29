import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.5.0/+esm'
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.1.2/+esm'

cob.custom.customize.push(async function (core, utils, ui) {

    // utils.loadScript("localresource/js/lib/axios.min.js", function () {
    // });

    const DEFINITION = "Business Processes";

    // Gerar diagrama mermaid
    core.customizeInstances(DEFINITION, async (instance, _presenter) => {
        const specificData = instance.findFields("Specific Data")[0].value;
        if(!specificData) return;

        let diagram = [
            {type: 'header', v: 'stateDiagram-v2'},
            {type: 'style', v: 'classDef RPA         color:#99c240, padding:0px 3px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px'},
            {type: 'style', v: 'classDef Human       color:#1e80ba, padding:0px 5px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px'},
            {type: 'style', v: 'classDef AI          color:#d15802, padding:0px 4px, border-radius:10px, border: 1px solid gray, background-color: white, font-size: 10px'},
            {type: 'style', v: 'classDef BgDimGreen  fill:#C1FA77'},
            {type: 'style', v: 'classDef BgDimOrange fill:#FFE0D2'},
            {type: 'style', v: 'classDef BgDimRed    fill:lightpink'},
            {type: 'style', v: 'classDef Green       color:green,fill:white'},
            {type: 'style', v: 'classDef Red         color:red,fill:white'},
            {type: 'style', v: 'classDef Gray        color:gray,fill:white'},
        ];

        // ************
        //   Estados
        // ************

        // obter estados possíveis
        const specificDataDef = (await axios.get(
            `/recordm/recordm/definitions/name/${instance.findFields("Specific Data")[0].value}`
        )).data;
        // window.console.debug('JN', specificDataDef)

        const stateFieldDef = specificDataDef.fieldDefinitions.find(fd => fd.name == "Estado")
        // window.console.debug('JN', stateFieldDef)

        const states = stateFieldDef.configuration.keys.Select.args;
        window.console.debug('JN', states)

        const statesColors = stateFieldDef.configuration.extensions.$styleResultColumn 
                             && stateFieldDef
                                .configuration
                                .extensions
                                .$styleResultColumn
                                .args
                                .map(c => {let [state,color] = c.split(":"); return( {state:state,color:color} ) }  );

                             
        window.console.debug('JN', statesColors)

        states.forEach((state, idx) => {
            diagram.push({type: 'state', v: `state "${state}" as ${idx}`, id: idx})
            const stateColor = statesColors.find(c => c.state == state) || "none"
            if(stateColor) diagram.push({type: 'stateColor', v: `class ${idx} ${stateColor.color}`})
        });

        // **************
        //   Transições
        // **************

        // obter WQs relevantes

        const wqsQuery = `business_process:${instance.data.id}`;
        const wqs = (await axios.get(
            `/recordm/recordm/definitions/search?def=Work Queues&size=50&sort=code:asc&q=${wqsQuery}`
        )).data.hits.hits.map((hit) => hit._source);

        wqs.forEach((wq) => {
            const name = wq['name'][0];
            const agent = wq['agent_type'][0];

            // identificar estado inicial
            const launch_condition = wq['launch_condition'][0];
            const startState = /\s*msg\.field\(["']Estado['"]\)\.changedTo\(["']([^"']+)['"]\)/
                .exec(launch_condition)[1];
            const startStateIdx = states.findIndex(s => s == startState);
            if(startStateIdx < 0) window.console.error("não consegui encontrar estado inicial " + startState)


            // identificar estado final
            const mudaEstadoRE = /^updates\[["']Estado["']\]\s*=\s*["']([^"']+)["']/;
            const detectaMudaEstadoRE = /\s*data\.value\(["'](.*)['"]\)\s*==\s*["']([^"']+)['"]/;
            const linhas = wq['on_done'][0].split('\n');
            const eDecisao = linhas.length > 1;
            if(eDecisao){
                window.console.debug('JN', 'decisao', linhas)
                diagram.push({type: 'choice', v: `state d_${startStateIdx} <<choice>>`})
                if(startStateIdx >= 0){
                    diagram.push({type: 'transition', from: startStateIdx, to: `d_${startStateIdx}`, name: name, agent: agent})
                }
            }
            linhas.forEach(on_done => {

                let endState;
                let decisionName = name;
                const matchSimple = mudaEstadoRE.exec(on_done);
                if(matchSimple){
                    window.console.debug('JN', 'matchSimple', matchSimple)
                    endState = matchSimple[1];

                } else {
                    const matchIf = /^if\s*\((.*)\s*\)\s*{\s*(.*)\s*}\s*$/.exec(on_done);
                    if(matchIf){
                        window.console.debug('JN', 'matchesIF', matchIf);
                        endState = mudaEstadoRE.exec(matchIf[2])[1];
                        const matchFrom = detectaMudaEstadoRE.exec(matchIf[1]);
                        if(matchFrom) {
                            decisionName = "" + matchFrom[1] + ' = ' + matchFrom[2] + "";
                        } else {
                            window.console.error("não consegui extrair de " + matchIf[1]);
                            decisionName = "FALTA";
                        }
                    } else {
                        window.console.error('não percebo a linha', on_done)
                    }
                }

                const endStateIdx = states.findIndex(s => s == endState);
                if(endStateIdx < 0) window.console.error("não encontrei o estado " + endState)

                if(startStateIdx >= 0 && endStateIdx >= 0) {
                    if(eDecisao) {
                        diagram.push({type: 'decision', v: `d_${startStateIdx} --> ${endStateIdx}: ${decisionName}`, to:endStateIdx})

                    } else {
                        diagram.push({type: 'transition', from: startStateIdx, to: endStateIdx, name: name, agent: agent})
                    }
                }

                window.console.debug('JN', 'transition', name, ':', startStateIdx, startState, endStateIdx, endState);
            })

        });


        // **********************
        //    Processar Gráfico
        // **********************

        // transformar <<choice>> com >1 entradas num <<join>>
        const joins = diagram
            .filter(l => l.type == 'transition' && /d_/.test(l.to))
            .map(l => l.to)
            .reduce(( acc, curr ) => { if(!acc[curr]){ acc[curr] = 1 } else { acc[curr] = acc[curr] + 1 }; return acc;}, {});

        for(const stateId in joins){
            if(joins[stateId] > 1) {
                // trocar <<choice>> por <<join>>
                diagram
                    .filter(l => l.type == 'choice' && new RegExp(`state ${stateId} `).test(l.v))
                    .forEach(l => l.v = l.v.replaceAll('<<choice>>', '<<join>>'))


                // juntar condições que saem do <<join>>
                const outgoingDecisions = diagram
                    .filter(l => l.type == 'decision' && new RegExp(`^${stateId} --> `).test(l.v) );
                const commonPart = outgoingDecisions[0].v.substring(0, outgoingDecisions[0].v.indexOf(':'));
                const joinedCondition = outgoingDecisions
                    .map(l => l.v.substring(commonPart.length + 1))
                    .join(" && ")
                window.console.debug('JN', 'choices', 'decisions',`^d_${stateId} --> `, joinedCondition );
                diagram = diagram.filter(l => l.type != 'decision' || !l.v.startsWith(commonPart));
                diagram.push({type: 'decision', v: `${commonPart}: ${joinedCondition}`, to: outgoingDecisions[0].to})

            }
        }

        // Gerar transições
        const icons = { Human: 'fa-person', RPA: 'fa-robot', AI: 'fa-street-view'}
        diagram.filter(l => l.type == 'transition').forEach(t => {
            const desc = `<div class="${t.agent}"><span><i class="fa-solid ${icons[t.agent]}"></i></span> ${t.name}</div>`;
            t.v = `${t.from} --> ${t.to}: ${desc}`;
        });


        // *****************
        //   Gerar Gráfico
        // *****************

        let mermaidSrc = "stateDiagram-v2 \n\n"
        // Adicionar só estilos
        mermaidSrc += diagram.filter(l => l.type == "style").map(l => l.v).join('\n') + "\n\n";
        // Adicionar só cores
        mermaidSrc += diagram.filter(l => l.type == "stateColor").map(l => l.v).join('\n') + "\n\n";
        // Adicionar só estados (mas sem estados não usados)
        mermaidSrc += diagram.filter(l => l.type == "state").filter(s => diagram.find(l => s.id == l.to || s.id == l.from)).map(l => l.v).join('\n') + "\n\n";
        // Adicionar só estados decisões e junções
        mermaidSrc += diagram.filter(l => l.type == "choice").map(l => l.v).join('\n') + "\n\n";
        // Adicionar o resto, transições e decisões
        mermaidSrc += diagram.filter(l => l.type == "decision" 
                                       || l.type == "transition").map(l => l.v).join('\n');
        
        window.console.debug('JN', 'mermaidSrc', mermaidSrc)

        const mermaidStringified = JSON.stringify({code: mermaidSrc, mermaid: {theme: "default"} });
        const mermaidEncoded = new TextEncoder().encode(mermaidStringified);
        const mermaidLink = `https://mermaid.live/edit#base64:${btoa(String.fromCodePoint(...mermaidEncoded))}`;

        // Work Queues
        $(".custom-workQueues")
            .after('<pre class="mermaid" style="margin:0px 14px; ">' + mermaidSrc + '</pre>')
            .after(`<a href="${mermaidLink}" style="margin:0px 14px;" target=_blank>Editor Mermaid</a>`)

        mermaid.initialize({startOnLoad:false})
        setTimeout( () =>  mermaid.init() , 10)
    });
});

