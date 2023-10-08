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

        let diagramSrc = [ 'stateDiagram-v2' ];

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

        states.forEach((state, idx) => {
            diagramSrc.push(`state "${state}" as ${idx}`);
        });

        // **************
        //   Transições
        // **************

        // obter WQs relevantes

        const wqs = (await axios.get(
            `/recordm/recordm/definitions/search/name/Work Queues?size=50&q=business_process:${instance.data.id}`
        )).data.hits.hits.map((hit) => hit._source);
        window.console.debug('JN', wqs)

        wqs.forEach((wq) => {
            const name = wq['name'][0];

            // identificar estado inicial
            const launch_condition = wq['launch_condition'][0];
            let startState;
            // if(/^\s*msg\.action\s*==\s*["']add['"]/.test(launch_condition)){
            //     startState = '[*]';

            // } else {
                startState = /\s*msg\.field\(["']Estado['"]\)\.changedTo\(["']([^"']+)['"]\)/
                    .exec(launch_condition)[1];
            // }
            const startStateIdx = states.findIndex(s => s == startState);
            if(startStateIdx < 0) window.console.error("não consegui encontrar estado inicial " + startState)


            // identificar estado final
            const mudaEstadoRE = /^updates\[["']Estado["']\]\s*=\s*["']([^"']+)["']/;
            const detectaMudaEstadoRE = /\s*data\.value\(["'].*['"]\)\s*==\s*["']([^"']+)['"]/;
            const linhas = wq['on_done'][0].split('\n');
            const eDecisao = linhas.length > 1;
            if(eDecisao){
                window.console.debug('JN', 'decisao', linhas)
                diagramSrc.push(`state decision_${startStateIdx} <<choice>>`)
                if(startStateIdx >= 0){
                    diagramSrc.push(`${startStateIdx} --> decision_${startStateIdx}: ${name}`)
                }
            }
            linhas.forEach(on_done => {

                let endState;
                let targetName = name;
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
                            targetName = matchFrom[1];
                        } else {
                            window.console.error("não consegui extrair de " + matchIf[1]);
                            targetName = "FALTA";
                        }
                    } else {
                        window.console.error('não percebo a linha', on_done)
                    }
                }

                const endStateIdx = states.findIndex(s => s == endState);
                if(endStateIdx < 0) window.console.error("não encontrei o estado " + endState)

                if(startStateIdx >= 0 && endStateIdx >= 0) {
                    if(eDecisao) {
                        diagramSrc.push(`decision_${startStateIdx} --> ${endStateIdx}: ${targetName}`)

                    } else {
                        diagramSrc.push(`${startStateIdx} --> ${endStateIdx}: ${name}`)
                    }
                }

                window.console.debug('JN', 'transition', name, ':', startStateIdx, startState, endStateIdx, endState);
            })

        });

        // *****************
        //   Gerar Gráfico
        // *****************

        window.console.debug('JN', 'diagramSrc', diagramSrc.join('\n'))

        // Work Queues
        $(".field-def-id-881")
            .before('<pre class="mermaid" style="margin:0px 14px">' + diagramSrc.join("\n") + '</pre>')
        
        mermaid.initialize({startOnLoad:false})
        setTimeout( () =>  mermaid.init() , 10)
    });
});

