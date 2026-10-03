
async function obterMermaid(limiteMs = 10000) {
  const fim = Date.now() + limiteMs;
  while (!window.mermaid && Date.now() < fim) {
    await new Promise(r => setTimeout(r, 50));
  }
  return window.mermaid || null;
}

cob.custom.customize.push(async function(core, utils, ui) {

  const DEFINITION = "Work Queues";
  const WQ_STATES_FIELD = "Possible States";

  const STATES_DEFINITION = [
    { label: "To Assign", number: 1 },
    { label: "To Do", number: 2 },
    { label: "In Progress", number: 3 },
    { label: "Done", number: 4 },
    { label: "Pending", number: 5 },
    { label: "Error", number: 6 },
    { label: "Canceled", number: 7 },
  ];

  const FULL_PROCESS = `
        stateDiagram-v2
            state "Error" as 6
            state "Canceled" as 7

            state Execution {
                state "To Assign" as 1
                state "To Do" as 2
                state "In Progress" as 3
                state "Done" as 4
                state "Pending" as 5
            }

            1 --> 2 : Assign
            2 --> 3 : Start
            2 --> 4 : Complete

            3 --> 5 : Suspend

            2 --> 5 : Suspend
            5 --> 2 : Resume

            3 --> 4 : Complete
            Execution --> 6 : Fail
            Execution --> 7 : Cancel
        `;

  async function updateMermaid(states) {
    const mermaid = await obterMermaid();
    if (!mermaid) {
      window.console.warn("Work Queues: mermaid não carregou, diagrama omitido");
      return;
    }

    const impossibleStates = STATES_DEFINITION.filter(s => states.indexOf(s.label) === -1)
    .map(s => s.number);

    const actualProcess = FULL_PROCESS.split("\n")
    .filter(l => impossibleStates.every(i => l.indexOf(" " + i) === -1))
    .join("\n");

    const { svg } = await mermaid.render("mermaid-container", actualProcess);
    document.getElementById("diagram-container").innerHTML = svg;
  }

  core.customizeInstances(DEFINITION, async (instance, presenter) => {

    const workQueueStateFP = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === WQ_STATES_FIELD)?.[0];

    workQueueStateFP.content().find("input[type=checkbox]").on("change", function() {
      if(workQueueStateFP.getValue()) {
        updateMermaid(workQueueStateFP.getValue().split("\u0000"));
      }
    });

    let lastSimbling = workQueueStateFP.content().find(".radiogroup");
    $("<div id='diagram-container' style='margin:0 14px'></div>").insertAfter(lastSimbling);
    $("<div id='mermaid-container'></div>").insertAfter(lastSimbling);

    if (workQueueStateFP.getValue()) await updateMermaid(workQueueStateFP.getValue().split("\u0000"));
  });

});
