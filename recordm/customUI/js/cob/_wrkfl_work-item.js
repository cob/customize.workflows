cob.custom.customize.push(async function (core, utils, ui) {

    utils.loadScript("localresource/js/lib/axios.min.js", function () {
    });

    const DEFINITION = "Work Item";
    const WI_WORK_QUEUE_FIELD = "Work Queue";
    const WI_TARGET_STATE_FIELD = "State";

    const STATES_DEFINITION = [
        {label: "To Assign", next: ["To Do"]},
        {label: "To Do", next: ["Pending", "In Progress", "Canceled", "Done", "Error"]},
        {label: "In Progress", next: ["Pending", "Canceled", "Done", "Error"]},
        {label: "Done"},
        {label: "Pending", next: ["To Do", "Canceled", "Done", "Error"]},
        {label: "Snoozed", next: ["To Do"]},
        {label: "Canceled"},
        {label: "Error"},
    ];

    const ACTIONS = {
      "To Assign -> To Do": "Assign",
      "To Do -> Pending": "Suspend",
      "To Do -> In Progress": "Start",
      "To Do -> Canceled": "Cancel",
      "To Do -> Done": "Complete",
      "To Do -> Error": "Fail",
      "In Progress -> Pending": "Suspend",
      "In Progress -> Canceled": "Cancel",
      "In Progress -> Done": "Complete",
      "In Progress -> Error": "Fail",
      "Pending -> To Do": "Resume",
      "Pending -> Canceled": "Cancel",
      "Pending -> Done": "Complete",
      "Pending -> Error": "Fail"
    }

    function loadWorkQueueInfo(workQueueId) {
        const query = `/recordm/recordm/definitions/search/name/Work Queues?from=0&size=1&q=id.raw:${workQueueId}`;
        return axios.get(query);
    }

    core.customizeInstances(DEFINITION, async (instance, presenter) => {
        const workQueueId = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === WI_WORK_QUEUE_FIELD)?.[0].getValue();

        const workQueueStates = await loadWorkQueueInfo(workQueueId)
            .then(resp => resp.data)
            .then(data => data.hits.hits[0]._source.possible_states);

        // Filter the object STATES_DEFINITION to contain only the states defined in the work queue
        const possibleStates = workQueueStates.map(state => STATES_DEFINITION.find(s => s.label === state))
            .filter(state => state);

        let options = [];

        const wiStatetFP = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === WI_TARGET_STATE_FIELD)?.[0];

        // If new instance set the state with the first one from the possible states
        if (instance.id === -1 || !wiStatetFP.getValue()) {
            wiStatetFP.setValue(possibleStates[0].label);
            // Filter next states by showing only the states that are defined in the work queue
            options = [possibleStates[0].label, ...(possibleStates[0].next ? possibleStates[0].next.filter(s => workQueueStates.indexOf(s) !== -1) : [])];

        } else {
            const currentState = possibleStates.find(s => s.label === wiStatetFP.getValue());
            // Filter next states by showing only the states that are defined in the work queue
            options = [wiStatetFP.getValue(), ...(currentState.next ? currentState.next.filter(s => workQueueStates.indexOf(s) !== -1) : [])];
        }

        const $input = wiStatetFP.content().find(".field-value");
        $input.css("display", "none");
        $input.after($(`<div><select class="js-wi-state">${options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}</select></div>`).html());

        wiStatetFP.content().find(".js-wi-state")
            .val(wiStatetFP.getValue())
            .on("change", function () {
                wiStatetFP.setValue(this.value);
            });
    });


    $(document).on("click", `button.js-change-state`, function (ev) {
        ev.preventDefault();

        const workItemInstance = $(ev.target)
        const workItemId = workItemInstance.attr("data-workitem-id")
        const nextState = workItemInstance.attr("data-next-state")

        axios.post("/integrationm/concurrent/change-work-item-state", {workItemId, nextState})
            .then(() => {
                setTimeout(() => {
                    $(".js-form-search").find(".btn-search").click()
                }, 1000)

                // AHAHAHAH
                setTimeout(() => {
                    $(".js-references-refresh-btn").click()
                }, 1000)

                setTimeout(() => {
                    $(".js-references-refresh-btn").click()
                }, 2000)
            })
    })

    core.customizeColumns(DEFINITION, {
        [WI_TARGET_STATE_FIELD]: function (node, esDoc, colDef) {
            if (!esDoc["#_work_queue_states"]) {
                return
            }

            const workQueueStates = esDoc["#_work_queue_states"]

            const possibleStates = workQueueStates.map(state => STATES_DEFINITION.find(s => s.label === state))
                .filter(state => state);

            const currentState = esDoc[WI_TARGET_STATE_FIELD.toLowerCase()]?.length > 0
                ? possibleStates.find(state => esDoc[WI_TARGET_STATE_FIELD.toLowerCase()][0] === state.label)
                : possibleStates[0]

            const nextStateButtons = (currentState.next?.filter(s => workQueueStates.indexOf(s) !== -1) || [])
              .map(s => `<button type="button" data-workitem-id="${esDoc.instanceId}" data-next-state="${s}" class="js-change-state px-3 py-0 text-xs text-center text-white rounded-md focus:ring-4 bg-sky-400">${ACTIONS[currentState.label + " -> " + s]}</button>`)
              .join("");

            const nodeContent = $(`<div class="js-work-item-${esDoc.instanceId} flex w-full mx-2 text-left"><div class="w-20">${currentState.label}</div><div class="pl-2 flex-1 flex gap-1 bg-white">${nextStateButtons}</div></div>`)
            $(node).html(nodeContent)
        }
    });

});