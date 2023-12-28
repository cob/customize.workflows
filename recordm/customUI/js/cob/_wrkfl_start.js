cob.custom.customize.push(function(core, utils, ui){
    let definitionName;

    function callWrflStartAction(definitionName, query, cb) {
        $.ajax({
            url: "/integrationm/concurrent/_wrkfl_start",
            method: "POST",
            data: JSON.stringify({def: definitionName, query: query}),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            xhrFields: {withCredentials: true},
            cache: false,
            ignoreErrors: true,
            error: function(xhr, _status, _err) {
                if (xhr.status === 403) {
                    ui.notification.showError("Não tem permissões para arrancar processos", true);
                } else {
                    ui.notification.showError(`Erro ao arrancar processos: ${xhr.responseJSON.msg} `, true);
                }
            },
            complete: function(_jqXHR, _textStatus) {
                cb();
            }
        });

    }

    core.addCustomBatchAction({
        key: '_wrkfl_start',
        label: 'Workflow Start',
        isAllowed: function(definitionM) {
            definitionName = definitionM.getName();
            // criar um grupo específico
            return core.getGroups().includes("System")
              && !["Business Process", "Work Queue", "Work Item"].includes(definitionName);
        },
        execute: function(definitionId, indexedInstancesM, _ctx) {
            const ids = indexedInstancesM.map((i) => i.getInstanceId());
            const query = `id.raw:(${ids.join(' OR ')})`;

            window.console.debug('[_wrkfl_start]', 'execute', definitionName, indexedInstancesM.length, ids, query);

            core.showLoading('callWrflStartAction');
            callWrflStartAction(definitionName, query, () => {
                core.hideLoading('callWrflStartAction');
            });
        },
        executeOnQuery: function(definitionId, query, ctx) {
            window.console.debug('[_wrkfl_start]', 'executeOnQuery', definitionName, query);

            core.showLoading('callWrflStartAction');
            callWrflStartAction(definitionName, query, () => {
                core.hideLoading('callWrflStartAction');
            });
        }
    });

})
