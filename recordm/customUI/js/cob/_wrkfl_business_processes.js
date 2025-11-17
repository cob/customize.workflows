import embedMermaid from "./_wrkfl_processes.js"
import { CLASS_OPTIONS } from "./_wrkfl_processes.js"

window.embedMermaid = embedMermaid

cob.custom.customize.push(async function (core, utils, ui) {

    const DEFINITION = "Business Processes";

    const COLOR_SELECTOR = `
        <div class="grid grid-cols-[auto_auto] gap-8">
            <div class="grid h-fit grid-cols-[220px_1fr] gap-4 mb-4">
                --OPTIONS--
            </div>
            <div class="h-fit mb-4">
                --DESC--
            </div>
        </div>
    `


    function stateSelect(stateName, defaultClass) {

        const hasCustomClass = CLASS_OPTIONS.findIndex( o => o == defaultClass) < 0 && defaultClass !== undefined

        return `
            <span state="${stateName}" class="${defaultClass ?? CLASS_OPTIONS[0]} rounded-md rounded px-2 flex items-center content-start" > ${stateName} </span>
            <div class="flex" state="${stateName}">
                <select class="js-color-select-state ${hasCustomClass ? '!w-8' : ''} !m-0"  data-state-value="${stateName}" onchange ="window.bpo.calcDesc(); window.bpo.updateStateClass('${stateName}', this.value); window.bpo.addInputIfCustom('${stateName}', this.value)"> 
                    ${CLASS_OPTIONS.map( opt => `<option value="${opt}" ${defaultClass == opt ? 'selected' : ''}>${opt}</option>`)}
                    <option ${hasCustomClass ? 'selected' : ''}>Custom</option>
                </select>
                <input class="${hasCustomClass ? '' : 'hidden'} px-2" style="width:100%" state="${stateName}" onchange="window.bpo.calcDesc(); window.bpo.updateStateClass('${stateName}', this.value)" value="${hasCustomClass ? defaultClass : ""}" />
            </div>`
    }

    async function instancesWithStates(stateList, statefield, def) {
        const defId = await fetch(`/recordm/recordm/definitions/name/${def}`)
            .then( resp => resp.json())
            .then( json => json.id )

        const elastic_state = statefield.toLowerCase().replaceAll(' ', '_')
        const queryString = `-${elastic_state}.raw:(${stateList.map(s => `"${s}"`).join(" OR ")})`
        const query = `/recordm/recordm/definitions/search?def=${def}&q=${queryString}&size=0`

        const total = (await (await fetch(query)).json()).hits.total.value 
        const uiLink = `/recordm/#/definitions/${defId}/q=${queryString}`
        return {total, uiLink}
    }

    window.bpo = {} || window.bpo 

    window.bpo.copyDesc = () => {
        ui.notification.showInfo("Copiado final", false);
        navigator.clipboard.writeText( document.querySelector('.js-final-desc').innerHTML );
    }

    window.bpo.addInputIfCustom = (stateName, stateValue) => {
        if(stateValue == "Custom") {
            document.querySelector(`.js-color-select-state[data-state-value="${stateName}"]`).classList.add('!w-8')
            document.querySelector(`input[state="${stateName}"]`).classList.remove('hidden')
        } else {
            document.querySelector(`.js-color-select-state[data-state-value="${stateName}"]`).classList.remove('!w-8')
            document.querySelector(`input[state="${stateName}"]`).classList.add('hidden')
        }
    }

    window.bpo.updateStateClass = (stateName, classToAdd) => {
        document.querySelector(`span[state="${stateName}"]`).classList = classToAdd +
         " rounded-md rounded px-2  flex items-center content-start"
    }

     window.bpo.copyUnused = () => {
        ui.notification.showInfo("Copiado intermédia", false);
        navigator.clipboard.writeText( document.querySelector('.js-unused-desc').getAttribute('data-value') );
    }

    window.bpo.calcDesc = () => {
        console.log("teste 1")
        let colors = []
        let states = []
        document.querySelectorAll(".js-color-select-state").forEach( e => {
            const statename = e.getAttribute('data-state-value')
            let val = e.value
            if(val == "Custom") {
                val = document.querySelector(`input[state="${statename}"]`).value + " custom"
                console.log(val)
            }


            colors.push( statename+ ":" + val)
            states.push( statename ) 
        })
        const styleResult = `$styleResultColumn(${colors.join(', ')})`
        const select = `$[${states.join(', ')}]`
        document.querySelector('.js-final-desc').innerHTML = select + " " + styleResult
    }

    // Gerar diagrama mermaid
    core.customizeInstances(DEFINITION, async (instance, _presenter) => {
        const specificData = instance.findFields("Specific Data")[0].value;
        const stateField = instance.findFields("State Field")[0].value;

        if(!specificData) return;

        const data = await embedMermaid(instance.data.id, specificData, stateField, document.querySelector(".custom-workQueues"), {linkToBP: false})        

        const updateDef = "<button class='js-update-def-btn btn btn-small btn-primary' style='margin-top: 5px;'><i class=\"fa-solid fa-highlighter mr-2\"></i><span>Update Def</span></button>";
        document.querySelector(".js-sidenav-btn-container").insertAdjacentHTML("beforeend", updateDef);

        const optionsString = data.usedStateNames.map( state => stateSelect(state, data.colors[state]) ).join('')
        
        let desc = `
        <div class="!text-xs bg-gray-200 p-3 pb-6 rounded-md mb-2 relative">
            <span class="js-final-desc">
                $[${data.usedStateNames.join(', ')}] 
                $styleResultColumn(${data.usedStateNames.map(s => `${s}:${data.colors[s] ?? CLASS_OPTIONS[0]}`).join(', ')})   
            </span>
            <i class="absolute right-2 bottom-2 cursor-pointer fa-regular fa-clipboard" onclick="window.bpo.copyDesc()"></i>
        </div>   
        `

        if(data.unusedStateNames.length > 0) {

            const unusedStats = await instancesWithStates(data.usedStateNames, stateField, specificData)            

            if(unusedStats.total > 0 ){
                desc += ` 
                <div class="text-sm bg-red-200 p-3 rounded-md mb-2 relative">
                    <i class=" text-red-800 fa-solid fa-circle-exclamation"></i> Há <a href='${unusedStats.uiLink}'>${unusedStats.total}</a> instancias com estados que não estão presentes nos finais.
                    <br><br>
                    <span class="text-xs js-unused-desc" data-value="$[${data.unusedStateNames.concat(data.usedStateNames).join(', ')}]"> 
                    $[${data.unusedStateNames.map(u => `<s class="text-red-500">${u}</s>`).concat(data.usedStateNames).join(', ')}] 
                    </span>
                    <i class="absolute right-2 bottom-2 cursor-pointer fa-regular fa-clipboard" onclick="window.bpo.copyUnused()"></i>
                </div>
                `
            }
        }
        
        document.querySelector(".js-update-def-btn").addEventListener("click", () => {
            new ui.dialogs.InfoDialog(core, {
                "title": "Actualizar Definição", 
                "message": COLOR_SELECTOR.replace("--OPTIONS--", optionsString).replace("--DESC--", desc), 
                "closeBtnLabel": "Fechar"
            });
            setTimeout( () => {
                document.querySelector('.info-dialog').classList.add("bpo-def-modal")
            }, 500)
        })
    })


});
