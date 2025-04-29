import MockServer from "sap/ui/core/util/MockServer";

export default {

    init: function () {
        // create
        const mockServer = new MockServer({
            rootUri: sap.ui.require.toUrl("sap/opu/odata/sap/ZODATA_MSTT_SP1_SRV")
        });

        const urlParams = new URLSearchParams(window.location.search);

        // configure mock server with a delay
        MockServer.config({
            autoRespond: true,
            autoRespondAfter: parseInt(urlParams.get("serverDelay") || "500")
        });

        // // simulate
        // const path = sap.ui.require.toUrl("ui5/mstt/localService");
        // mockServer.simulate(path + "/metadata.xml", path + "/mockdata");

        // start
        mockServer.start();
    }
};