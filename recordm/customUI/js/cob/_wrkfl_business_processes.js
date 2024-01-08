import embedMermaid from "./_wrkfl_processes.js"
window.embedMermaid = embedMermaid

cob.custom.customize.push(async function (core, utils, ui) {

    const DEFINITION = "Business Processes";

    // Gerar diagrama mermaid
    core.customizeInstances(DEFINITION, async (instance, _presenter) => {
        const specificData = instance.findFields("Specific Data")[0].value;
        const stateField = instance.findFields("State Field")[0].value;
        if(!specificData) return;

        await embedMermaid(instance.data.id, specificData, stateField, $(".custom-workQueues"))

        
    });
});

