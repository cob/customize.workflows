cob.custom.customize.push(async function(core, utils, ui) {

    utils.loadScript("localresource/js/lib/axios.min.js", function() {
    });

    const DEFINITION = "Work Item";
    const WI_WORK_QUEUE_FIELD = "Work Queue";
    const WI_TARGET_STATE_FIELD = "State";

    const STATES_DEFINITION = [
        {label: "To Assign", next: ["To Do"]},
        {label: "To Do", next: ["Pending", "In Progress", "Done", "Canceled", "Error"]},
        {label: "In Progress", next: ["Pending", "Done", "Canceled", "Error"]},
        {label: "Pending", next: ["To Do", "Canceled", "Error"]},
        {label: "Done"},
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
        "Pending -> Error": "Fail"
    }

    function loadWorkQueueInfo(workQueueId) {
        const query = `/recordm/recordm/definitions/search/name/Work Queues?from=0&size=1&q=id.raw:${workQueueId}`;
        return axios.get(query);
    }

    core.customizeInstances(DEFINITION, async (instance, presenter) => {
        const workQueueFP = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === WI_WORK_QUEUE_FIELD)?.[0];


        const setState = async function() {
            const workQueueId = workQueueFP?.getValue();

            console.warn("JB workQueueId ", workQueueId)
            //TODO jbarata : quando se corrigir o bug do auto ref com multiples pode usar-se este campo em vez de ir buscar à WQ (e mudar o onchange para usar este campo)
            //   const _possibleStates = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === "#_Work Queue States")?.[0];
            //   console.warn("JB 1 ", _possibleStates.getValue())

            const workQueueStates = await loadWorkQueueInfo(workQueueId)
                .then(resp => resp.data)
                .then(data => data.hits.hits[0]._source.possible_states);

            // Filter the object STATES_DEFINITION to contain only the states defined in the work queue
            const possibleStates = workQueueStates.map(state => STATES_DEFINITION.find(s => s.label === state))
                .filter(state => state);

            let options = [];

            const wiStatetFP = presenter.findFieldPs(fp => fp.field.fieldDefinition.name === WI_TARGET_STATE_FIELD)?.[0];

            const stateOrig = wiStatetFP.getValue();


            // If new instance set the state with the first one from the possible states
            if (instance.isNew() || !stateOrig) {
                wiStatetFP.setValue(possibleStates[0].label);
                // Filter next states by showing only the states that are defined in the work queue
                options = [possibleStates[0].label, ...(possibleStates[0].next ? possibleStates[0].next.filter(s => workQueueStates.indexOf(s) !== -1) : [])];

            } else if (stateOrig === "Error") {
                options = ["Error"]; //The Error option is only available when the State is Error (System-Only state)

            } else {
                let currentState = possibleStates.find(s => s.label === stateOrig);
                if (currentState === undefined) { //WQ must have changed
                    currentState = possibleStates[0];
                    wiStatetFP.setValue(possibleStates[0].label);
                }
                // Filter next states by showing only the states that are defined in the work queue
                options = [currentState.label, ...(currentState.next ? currentState.next.filter(s => workQueueStates.indexOf(s) !== -1) : [])];
            }

            // Reset all options when setting a work queue
            $("option", wiStatetFP.content()).remove();
            const $list = $(`select#f${wiStatetFP.getId()}`, wiStatetFP.content());
            options.forEach((state) => {
                const $option = $(`<option value="${state}">${state}</option>`);
                $list.append($option);
            });
        }

        presenter.onFieldChange(WI_WORK_QUEUE_FIELD, setState);

    });

    const callChangeWiStateConcurrent = function(workItemId, nextState) {
        axios.post("/integrationm/concurrent/_wrkfl_change-work-item-state", {workItemId, nextState})
            .then(() => {
                setTimeout(() => {
                    $(".js-form-search").find(".btn-search").click()
                    $(".js-references-refresh-btn").click()

                    if (nextState === "Done") {
                        //Refresh the enclosing instance if there is one and there is a refresh button
                        $(".js-refresh-instance").click()
                    }
                }, 1000)

                setTimeout(() => {
                    $(".js-references-refresh-btn").click()
                }, 2000)
            })
            .catch(error => {
                ui.dialogs.InfoDialog(core, {
                        "title": "Error",
                        "message": " Could not complete task.<br><br>" + error.response.data.error + "<br>Check that all data is saved.",
                        "closeBtnLabel": "OK"
                    },
                    {
                        onClose: function() {
                            //we need to refresh the enclosing instance because the instance was saved and the version changed
                            $(".js-refresh-instance").click()
                        }
                    });

            })
    }

    core.customizeAllInstances(function(instance, presenter) {
        const onStateChanged = function(ev) {
            ev.preventDefault();

            // HACK: this is an already saved instace and it would give an error if saved again. It's an error condition that must be fixed in ui-all
            if (instance.data.id > 0 && instance.data._links && instance.data._links.update === "recordm/instances/-1") {
                console.warn("ERROR in data: an instace with id>0 has wrong update hateos link. This should not happpen ", instance.data.id, instance.data._links)
                return
            }

            const workItemInstance = $(ev.target)
            const workItemId = workItemInstance.attr("data-workitem-id")
            const nextState = workItemInstance.attr("data-next-state")
            const workItemCustomerDataId = workItemInstance.attr("data-customer-data-id")

            console.debug("JB in details")
            console.debug("JB ", instance)
            console.debug("JB wi customer data ", workItemCustomerDataId)

            const isInstanceVisible = $(`div#service-${workItemCustomerDataId}`).length > 0;
            const idOfDirectContainerInstance = ev.target.closest('div.js-recordm-instance').querySelector('div').id.substring(8);
            const isCorrectInstance = instance.data.id == idOfDirectContainerInstance;

            if(!isCorrectInstance && !isInstanceVisible) return;

            if (nextState === "Done" ||nextState === "In Progress" ||nextState === "Pending" || nextState === "Canceled") {
                if (isCorrectInstance) {
                    ui.notification.showInfo("Saving <b>" + instance.data.jsonDefinition.name + "</b> and completing work item...", false);
                } else {
                    ui.notification.showInfo("Saving <b>" + instance.data.jsonDefinition.name + "</b>", false);
                }

                presenter.saveInstance(function(_instanceData) {
                    //there may be other instances being saved from references details and we just want to call the
                    // concurrent once and when the main instance is being saved
                    if (isCorrectInstance) {
                        //give it 1 sec for the save to take effect in ES and the done conditions can be checked correctly
                        setTimeout(() => {
                            callChangeWiStateConcurrent(workItemId, nextState)
                        }, 1000)
                    }
                    //after everything is saved we want to discard the several details listners that are attached whenever we opened a references details
                    $(document).off(".workflow.details")
                })

            } else {
                callChangeWiStateConcurrent(workItemId, nextState)
            }

        }

        //allways reattach the event so we don't have duplicate events
        //Also, we attach the click to diferent eventnamespaces so that if an instance details is open inside a references, that is also saved
        $(document).off("click." + instance.data.id + ".workflow.details", "div.references-wrapper button.js-change-state")
        $(document).on("click." + instance.data.id + ".workflow.details", "div.references-wrapper button.js-change-state", onStateChanged)


        //detach the click event on this instance when it is actively saved (otherwise will give a version error when completing a tatsk)
        core.subscribe("recordm:saved:instance:" + instance.data.id, function() {
            $(document).off("click." + instance.data.id + ".workflow.details")
        });


    })


    core.customizeColumns(DEFINITION, {
        [WI_TARGET_STATE_FIELD]: function(node, esDoc, colDef) {
            if (!esDoc["#_work_queue_states"]) {
                return
            }

            const workQueueStates = esDoc["#_work_queue_states"]
            const worItemCustomerDataId = esDoc["customer_data"] ? esDoc["customer_data"][0] : undefined

            const possibleStates = workQueueStates.map(state => STATES_DEFINITION.find(s => s.label === state))
                .filter(state => state);

            let currentState = possibleStates[0];

            if (esDoc[WI_TARGET_STATE_FIELD.toLowerCase()]?.length > 0) {
                if (esDoc[WI_TARGET_STATE_FIELD.toLowerCase()][0] === "Error") {
                    currentState = {label: "Error"}
                } else {
                    currentState = possibleStates.find(state => esDoc[WI_TARGET_STATE_FIELD.toLowerCase()][0] === state.label)
                }
            }

            if (currentState === "" || currentState === undefined) {
                console.error("Current state not set. Has invalid value for the WQ :", esDoc[WI_TARGET_STATE_FIELD.toLowerCase()][0])
                return;
            }

            const nextStateButtons = esDoc["agent_type"]?.[0] === "Human" && esDoc["_links"]?.update
                 ? (currentState.next?.filter(s => workQueueStates.indexOf(s) !== -1) || [])
                    .map(s => `
                    <button
                        type="button"
                        data-workitem-id="${esDoc.instanceId}"
                        data-next-state="${s}"
                        data-customer-data-id="${worItemCustomerDataId}"
                        class="js-change-state px-3 py-0 text-xs text-center text-white rounded-md focus:ring-4 bg-sky-400 hover:bg-blue-600"
                    >
                        ${ACTIONS[currentState.label + " -> " + s]}
                    </button>`)
                    .join("")
                : []

            const nodeContent = $(`
                <div class="js-work-item-${esDoc.instanceId} -m-1 flex">
                    <div class="min-w-[80px] p-1 pl-10 w-20 text-left ">${currentState.label} ${nextStateButtons?.length ? ' ->' : ''}</div>
                    <div class="flex-1 text-left p-1 pl-2 flex gap-1 bg-white bg-opacity-50">${nextStateButtons}</div>
                </div>`)
            $(node).html(nodeContent)


            $(document).off("click.workflow.wiList", "section.search-definition button.js-change-state")
            $(document).on("click.workflow.wiList", "section.search-definition button.js-change-state", function(ev) {
                ev.preventDefault();
                const workItemInstance = $(ev.target)
                const workItemId = workItemInstance.attr("data-workitem-id")
                const nextState = workItemInstance.attr("data-next-state")

                console.debug("JB in workitem list")
                callChangeWiStateConcurrent(workItemId, nextState)

            })
        }
    });

});
