// Intended usage: AfterFX.exe -r path\to\ipc.jsx

#include "json2.js"
#include "util.jsx"

function _ipcModule() {
    /* Number of ms to wait inbetween connection polls */
    POLLING_INTERVAL = 500
    DEFAULT_PORT = 8008

    var tcpSocket;
    var lastTimeoutID;
    var doShutdown = false;

    var _log = Logger("ipc")
    _log.setLogLevel(LogLevel.DEBUG)
    _log.info("Initializing ExtendScript IPC")

    function listen() {
        deafen() // Remove lingering poll if there is one.
        doShutdown = false;
        _log.info('Starting listen...')
        tcpSocket = makeListeningSocket();

        function doPoll() {
            if (doShutdown) {
                _shutdown()
                return
            }
            // _log.debug('Polling...')
            var connection = tcpSocket.poll()
            if (connection != null) {
                _handleConnection(connection);
                connection.close();
                delete connection;
                _log.info("Connection closed");
            }
            // Poll (again) in a second
            lastTimeoutID = app.setTimeout(doPoll, POLLING_INTERVAL);
        }
        // Poll in a second
        lastTimeoutID = app.setTimeout(doPoll, POLLING_INTERVAL);
    }

    function listenBlocking() {
        deafen() // Remove lingering poll if there is one.
        doShutdown = false;
        _log.info('Starting listenBlocking')
        tcpSocket = makeListeningSocket();

        while (true) {
            if (doShutdown) {
                _shutdown()
                return
            }
            var connection = tcpSocket.poll()
            if (connection != null) {
                _handleConnection(connection);
                connection.close();
                delete connection;
                _log.info("Connection closed");
            }
        }
    }


    function deafen() {
        if (lastTimeoutID) {
            app.cancelTimeout(lastTimeoutID)
        }
    }

    function makeListeningSocket(port) {
        port = port || DEFAULT_PORT
        var tcpSocket = new Socket();
        if (tcpSocket.listen(port)) {
            return tcpSocket
        }
    }

    function _handleConnection(conn) {
        _log.info("Connection from " + conn.host);
        _log.debug("Handling connection...")
        conn.timeout = 5000;
        var input;
        while (conn.connected) {
            input = conn.readln()
            _log.info("INPUT: " + input)
            if (!input) {
                continue
            }
            var payload = JSON.parse(input);
            _log.info("command: " + payload['command'])
            var cmd_fnc = COMMAND_MAP[payload['command']]
            if (cmd_fnc === undefined) {
                msg = "Unrecognized command: " + payload['command']
                _log.warning(msg)
                conn.writeln(msg)
                continue
            }
            // else
            cmd_fnc(conn, payload['data'])
        }
        _log.info("Connection handler done...");
    }

    function _closeSocket() {
        _log.info('Closing socket')
        tcpSocket.close()
        delete tcpSocket;
    }

    function _shutdown() {
        _log.info('Shutting down application')
        _closeSocket()
        app.quit()
    }

    /**
        Command entry point functions.

        Always gets the connection and payload data passed to it.

        Each command function MUST return a single response.
    */
    COMMAND_MAP = {
        "echo": echo,
        "open_project": open_project,
        "close_project": close_project,
        "shutdown_application": shutdown_application,
        "set_comp_name": set_comp_name,
        "start_render": start_render
    }

    function echo(conn, data) {
        conn.writeln("ECHO: " + JSON.stringify(data))
    }

    function open_project(conn, data) {
        _log.info("Opening project: " + data["project_file"])
        // alert(data["project_file"]);
        var proj = new File(data["project_file"])
        app.open(proj);
        conn.writeln("OK")
    }

    function close_project(conn, data) {
        _log.info("Closing project...")
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES)
        conn.writeln("OK")
    }

    function shutdown_application(conn, data) {
        conn.writeln("Shutting down...")
        app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES)
        // Sets the shutdown flag. Cannot shutdown during the connection.
        doShutdown = true
    }

    function set_comp_name(conn, data){
        var compName = data["comp_name"];
        // Get the active project
        var project = app.project;
        
        // Check if a project is open
        if (project) {
            
            // Get the number of compositions in the project
            var numComps = project.rootFolder.numItems;
            var hasComp = false;
            var comp = null;

            // Loop through each item in the project root folder
            for (var i = 1; i <= numComps; i++) 
            {
            
                // Get the current item
                var currentItem = project.rootFolder.item(i);
                
                // Check if the item is a composition
                if (currentItem instanceof CompItem) 
                {
                    if(currentItem.name.indexOf(compName) !== -1)
                    {
                        hasComp = true;
                        comp = currentItem;
                    }
                }
            }
            if (hasComp)
            {
                var hasRQI = false;
                for (var j = 1; j <= app.project.renderQueue.numItems; j++)
                {
                    if(compName == app.project.renderQueue.item(j).comp.name)
                    {
                        hasRQI = true;
                        conn.writeln("OK");
                    }
                } 
                if (!hasRQI)
                {
                    app.project.renderQueue.items.add(comp);
                    conn.writeln("Created RQI");
                }
            
            }
            else {
                conn.writeln("Error: Comp doesn't exist in project");
            }
        }
    }

    var EPSILON = 0.00001
    // Maximum number of attempts to set the workAreaStart
    var _WORK_AREA_START_MAX_TRIES = 1000;

    function setWorkArea(compObject, start, duration, conn) {
        // For some reason, setting the workAreaStart needs to be run multiple times for it to work properly.
        // We'll try it for a set limit of tries before raising an error.
        // See: https://community.adobe.com/t5/after-effects-discussions/workareastart-and-workareaduration-behaviour-in-extendscript/m-p/13093413
        var halfFrameDuration = 1 / compObject.frameRate * 0.5;
        start = start + EPSILON; // Add float padding to ensure it rounds to the correct frame.
        duration = duration + EPSILON;
        for (x = 0; x <= _WORK_AREA_START_MAX_TRIES; x++) {
            compObject.workAreaStart = start;
            compObject.workAreaDuration = duration;
            if (start - halfFrameDuration < compObject.workAreaStart &&
                compObject.workAreaStart < start + halfFrameDuration &&
                duration - halfFrameDuration < compObject.workAreaDuration &&
                compObject.workAreaDuration < duration + halfFrameDuration
            ) {
                // Values are correct, stop looping.
                return
            }
        }
        // Check within epsilon range to account for rounding errors
        if (!(start - halfFrameDuration < compObject.workAreaStart && compObject.workAreaStart < start + halfFrameDuration)) {
            conn.writeln("Error: Could not set workAreaStart to " + start)
        }
        if (!(duration - halfFrameDuration < compObject.workAreaDuration && compObject.workAreaDuration < duration + halfFrameDuration)) {
            conn.writeln("Error: Could not set workAreaDuration to " + duration)
        }
    }


    function start_render(conn, data)
    {
        var frame = data["frame"];
        var duration = 0;
        var compName = data["comp_name"];
        var outputDirData = data["output_dir"];
        var outputPatternData = data["output_pattern"];
        var outputFormatData = data["output_format"];
        var comp = null;
        var numComps = app.project.rootFolder.numItems;
        // Loop through each item in the project root folder
        for (var i = 1; i <= numComps; i++) 
        {
            // Get the current item
            var currentItem = app.project.rootFolder.item(i);
            
            // Check if the item is a composition
            if (currentItem instanceof CompItem) 
            {
                if(currentItem.name.indexOf(compName) !== -1)
                {
                    comp = currentItem;
                }
            }
        }
        var RQI = null;
        for (var j = 1; j <= app.project.renderQueue.numItems; j++)
        {
            if(compName == app.project.renderQueue.item(j).comp.name)
            {
                var RQI_to_copy = app.project.renderQueue.item(j);
                RQI_to_copy.render = false;
            }
            else {
                app.project.renderQueue.item(j).render = false;
            }
        }
        var RQI = RQI_to_copy.duplicate();
        // var renderQueueItem = app.project.renderQueue.item(1).outputModule(1).getSettings(); // Assuming you want information for the first render queue item
        // alert(renderQueueItem["Format"]);
        output_file_settings = {
            "Output File Info": {
                "Base Path": outputDirData,
                "Subfolder Path":  "",
                "File Name": outputPatternData
            }
        }
        RQI.outputModule(1).setSettings(output_file_settings);

        // Set start frame and end frame
        var frameRate = comp.frameRate;
        var start = frame / frameRate;
        var end = (frame + 1) / frameRate; 
        var duration = end - start

        setWorkArea(RQI.comp, start, duration, conn);
        app.project.renderQueue.render();
        RQI.remove();
    
        conn.writeln("AEClient: Finished Rendering Frame " + frame);

        // app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
        // doShutdown = true;
    }

    return {
        "listen": listen,
        "listenBlocking": listenBlocking,
        "deafen": deafen
    }
}



ipc = _ipcModule()

ipc.listenBlocking()
