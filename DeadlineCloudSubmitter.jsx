{
	// Submit Queue to Deadline Cloud
	//
	// This script submits render jobs from the render queue to AWS Deadline Cloud
	// Requires installing the Deadline Cloud Monitor as well as deadline cloud gui components `pip install deadline[gui]`

	function SubmitQueueToDeadlineCloud(thisObj){

		//Global consts
		if(typeof _DEADLINECLOUD_SETTINGS === 'undefined')
		{
			const _DEADLINECLOUD_SETTINGS = "deadlinecloud";
		}
		if(typeof _DEADLINECLOUD_SEPARATEFRAMESINTOTASKS_SETTING === 'undefined')
		{
			const _DEADLINECLOUD_SEPARATEFRAMESINTOTASKS_SETTING = "separatetasks";
		}
		if(typeof _DEADLINECLOUD_FRAMESPERTASK_SETTING === 'undefined')
		{
			const _DEADLINECLOUD_FRAMESPERTASK_SETTING = "framespertask";
		}
		if(typeof _DEADLINECLOUD_MULTIFRAMERENDERING_SETTING === 'undefined')
		{
			const _DEADLINECLOUD_MULTIFRAMERENDERING_SETTING = "multiframe";
		}
		if(typeof _DEADLINECLOUD_MULTIFRAMERENDERINGMAX_SETTING === 'undefined')
		{
			const _DEADLINECLOUD_MULTIFRAMERENDERINGMAX_SETTING = "multiframemaxcpu";
		}

		function adcAlert(message){
			alert(message, "Deadline Cloud Submitter");
		}

		var scriptFolder = Folder.current.fsName;

		function buildUI(thisObj){
			var submitterPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Submit Queue to AWS Deadline Cloud", undefined, {resizable:true, closeButton:true});

			var root = submitterPanel.add("group");
			root.orientation = "column";
			root.alignment = ['fill', 'fill'];
			root.alignChildren = ['fill', 'top']
			var logoGroup = root.add("group");
			logoGroup.alignment = 'left';
			var logoImage = logoGroup.add("image", undefined, logoData());
			var logoText = logoGroup.add("statictext", undefined, "AWS Deadline Cloud");
			var arialBold24Font = ScriptUI.newFont("Arial", ScriptUI.FontStyle.BOLD, 64);
			logoText.graphics.font = arialBold24Font;
			var headerButtonGroup = root.add("group");
			var focusRenderQueueButton = headerButtonGroup.add("button", undefined,"Open Render Queue");
			focusRenderQueueButton.onClick = function(){
				//we quickly toggle the window to make sure it gains focus
				//sometimes this causes a flicker
				app.project.renderQueue.showWindow(false);
				app.project.renderQueue.showWindow(true);
			}
			var refreshButton = headerButtonGroup.add("button", undefined,"⟳");
			var listGroup = root.add("panel", undefined, "");
			listGroup.alignment = ['fill', 'fill'];
			listGroup.alignChildren = ['fill', 'fill']
			var list = null;
			var controlsGroup = root.add("group", undefined, "");
			controlsGroup.orientation = 'column';
			controlsGroup.alignment = ['fill', 'bottom'];

			var controlsPanel = controlsGroup.add("panel", undefined, "");
			controlsPanel.alignment = ['fill', 'top'];

			var separateFramesGroup = controlsPanel.add("group", undefined, "");
			separateFramesGroup.orientation = "row";
			separateFramesGroup.alignment = ['fill', 'top'];
			separateFramesGroup.alignChildren = ['left', 'top'];
			var separateFramesCheckbox = separateFramesGroup.add("checkbox", undefined, "");
			var persistedCheckboxState = app.settings.haveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_SEPARATEFRAMESINTOTASKS_SETTING) ? app.settings.getSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_SEPARATEFRAMESINTOTASKS_SETTING) === 'true' : true;
			separateFramesCheckbox.value = persistedCheckboxState; //Retrive the lockStateKey
			separateFramesCheckbox.alignment = ['left', 'center'];
			var separateFramesLabel = separateFramesGroup.add("statictext", undefined, "Separate frames into tasks (only affects image sequences)");
			separateFramesLabel.alignment = ['left', 'top'];

			var framesPerTaskOption = controlsPanel.add("group", undefined, "");
			framesPerTaskOption.orientation = "row";
			framesPerTaskOption.alignment = ['fill', 'top'];
			framesPerTaskOption.alignChildren = ['left', 'top'];
			var framesPerTaskLabel = framesPerTaskOption.add("statictext", undefined, "Images per task:");
			framesPerTaskLabel.alignment = ['left', 'center'];
			var persistentFramesPerTask = app.settings.haveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_FRAMESPERTASK_SETTING) ? app.settings.getSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_FRAMESPERTASK_SETTING) : "10";
			var framesPerTaskValue = framesPerTaskOption.add("edittext", undefined, persistentFramesPerTask);
			framesPerTaskValue.alignment = ['fill', 'top'];
			framesPerTaskValue.onChange = function(){
				framesPerTaskValue.text = String(Math.abs(parseInt(framesPerTaskValue.text)));
				if(framesPerTaskValue.text == "NaN"){
					framesPerTaskValue.text = "10";
				}
				app.settings.saveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_FRAMESPERTASK_SETTING, framesPerTaskValue.text);
			}
			framesPerTaskValue.enabled = separateFramesCheckbox.value;

			separateFramesCheckbox.onClick = function(){
				app.settings.saveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_SEPARATEFRAMESINTOTASKS_SETTING, separateFramesCheckbox.value.toString())
				framesPerTaskValue.enabled = separateFramesCheckbox.value;
			}

			var multiframeGroup = controlsPanel.add("group", undefined, "");
			multiframeGroup.orientation = "row";
			multiframeGroup.alignment = ['fill', 'top'];
			multiframeGroup.alignChildren = ['left', 'top'];
			var multiFrameCheckbox = multiframeGroup.add("checkbox", undefined, "");
			var persistedCheckboxState = app.settings.haveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERING_SETTING) ? app.settings.getSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERING_SETTING) === 'true' : true;
			multiFrameCheckbox.value = persistedCheckboxState; //Retrive the lockStateKey
			multiFrameCheckbox.alignment = ['left', 'center'];
			var multiFrameCheckboxLabel = multiframeGroup.add("statictext", undefined, "Multi-Frame Rendering");
			multiFrameCheckboxLabel.alignment = ['left', 'top'];

			var multiFrameMaxCPUGroup = controlsPanel.add("group", undefined, "");
			multiFrameMaxCPUGroup.orientation = "row";
			multiFrameMaxCPUGroup.alignment = ['fill', 'top'];
			multiFrameMaxCPUGroup.alignChildren = ['left', 'top'];
			var multiFrameMaxCPULabel = multiFrameMaxCPUGroup.add("statictext", undefined, "Max CPU Percentage:");
			multiFrameMaxCPULabel.alignment = ['left', 'center'];
			var persistentMultiFrameMax = app.settings.haveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERINGMAX_SETTING) ? app.settings.getSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERINGMAX_SETTING) : "90";
			var multiFrameMaxCPUValue = multiFrameMaxCPUGroup.add("edittext", undefined, persistentMultiFrameMax);
			multiFrameMaxCPUValue.alignment = ['fill', 'top'];
			multiFrameMaxCPUValue.onChange = function(){
				multiFrameMaxCPUValue.text = String(Math.max(1, Math.min(100, Math.abs(parseInt(multiFrameMaxCPUValue.text)))));
				if(multiFrameMaxCPUValue.text == "NaN"){
					multiFrameMaxCPUValue.text = "90";
				}
				app.settings.saveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERINGMAX_SETTING, multiFrameMaxCPUValue.text);
			}
			multiFrameMaxCPUValue.enabled = multiFrameCheckbox.value;

			multiFrameCheckbox.onClick = function(){
				app.settings.saveSetting(_DEADLINECLOUD_SETTINGS, _DEADLINECLOUD_MULTIFRAMERENDERING_SETTING, multiFrameCheckbox.value.toString())
				multiFrameMaxCPUValue.enabled = multiFrameCheckbox.value;
			}

			var submitButton = controlsGroup.add("button", undefined, "Submit");
			submitButton.onClick = function(){
				SubmitSelection(list.selection, separateFramesCheckbox.value ? parseInt(framesPerTaskValue.text) : 1, multiFrameCheckbox.value ? parseInt(multiFrameMaxCPUValue.text) : 0);
				list.selection = null;
			}
			submitButton.alignment = 'right';
			submitButton.enabled = false;

			function updateList(){
				var bounds = list == null ? undefined : list.bounds;
				var newList = listGroup.add("listbox", bounds, "", {
					numberOfColumns:4,
					showHeaders:true,
					columnTitles:['#', 'Name', 'Frames', 'Output Path'],
					columnWidths:[32, 160, 120, 240],
				});
				for(var i = 1; i <= app.project.renderQueue.numItems; i++){
					var rqi = app.project.renderQueue.item(i);
					if(rqi == null){
						continue;
					}
					if(rqi.status == RQItemStatus.RENDERING || rqi.status == RQItemStatus.WILL_CONTINUE|| rqi.status == RQItemStatus.USER_STOPPED|| rqi.status == RQItemStatus.ERR_STOPPED|| rqi.status == RQItemStatus.DONE ){
						continue;
					}
					var item = newList.add('item', i.toString());
					item.renderQueueIndex = i;
					item.compId = rqi.comp.id;
					item.subItems[0].text = rqi.comp.name;
					var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
					var startFrame = Number(timeToFrames(Number(renderSettings["Time Span Start"]), Number(renderSettings["Use this frame rate"])));
					var endFrame = Number(timeToFrames(Number(renderSettings["Time Span End"]), Number(renderSettings["Use this frame rate"]))) - 1;//end frame is inclusive so we subtract 1
					item.subItems[1].text = startFrame == endFrame ? startFrame.toString() : startFrame + "-" + endFrame;
					if(rqi.numOutputModules <= 0){
						item.subItems[2].text = "<not set>";
					} else if(rqi.numOutputModules == 1){
						var outputFile = rqi.outputModule(1).file;
						item.subItems[2].text = outputFile == null ? "<not set>" : outputFile.fsName; 
					} else {
						item.subItems[2].text = "<multiple output modules>";
						item.subItems[2].graphics.foregroundColor = errorText.graphics.newPen(errorText.graphics.PenType.SOLID_COLOR,[1.0,0.2,0.2], 1);
					}
				}

				if(list != null){
					listGroup.remove(list);
				}
				list = newList;
				list.onChange = function(){
					if(list.selection == null){
						updateList();
					}
					submitButton.enabled = list.selection != null;
					submitButton.active = false;
					submitButton.active = true;
				}
				list.selection = null;
			}

			updateList()

			refreshButton.onClick = function(){
				updateList();
			}

			submitterPanel.addEventListener('click', function(){
				updateList();
			}, true);

			submitterPanel.layout.layout(true);
			submitterPanel.onResizing = function(){
				this.layout.resize();
			}
			return submitterPanel;
		}

		function SubmitSelection(selection, framesPerTask, multiFramePercentage){
			//first we must verify that our selection is valid
			if(selection == null){
				adcAlert("Error: No selection");
				return false;
			}

			var renderQueueIndex = selection.renderQueueIndex;
			// var outputIndex = selection.outputModuleIndex;
			// var outputSettings;
			var rqi;

			//because our panel is updated independently of the render queue, the two may become out of sync
			//we need to verify that the selection made actually matches what is in the render queue
			if(renderQueueIndex < 1 || renderQueueIndex > app.project.renderQueue.numItems){
				adcAlert("Error: Render Queue has changed since last refreshing. Refreshing panel now. Please try again.");
				updateList();
				return;
			}
			rqi = app.project.renderQueue.item(renderQueueIndex);
			if(rqi == null || rqi.comp.id != selection.compId){
				adcAlert("Error: Render Queue has changed since last refresh. Refreshing panel now. Please try again.");
				updateList();
				return;
			}
			if(rqi.numOutputModules > 1)
			{
				var r=confirm("Warning: Multiple output modules detected. Rendering multiple output modules at once could result in undefined behavior. Continue?");
				if (!r){
					return;
				} 
			}

			//We have a valid selection
			var r=confirm("Project must be saved before submitting. Continue?");
			if (!r){
				return;
			} else {
				app.project.save();
			}
			if(app.project.file == null){
				//If the user hit yes to the prompt, but the file had never been saved, a second prompt would appear asking where they would want to save the project. If they hit cancel on the second prompt, the project file should be null and we should cancel the submission.
				return;
			}
			var outputPaths = [];
			for(var j = 1; j <= rqi.numOutputModules; j++){
				var outputModule = rqi.outputModule(j).file;
				if(outputModule == null){
					if(rqi.numOutputModules > 1)
					{
						adcAlert("Error: Output module does not have its output file set");
					} else {
						adcAlert("Error: One of your output modules does not have its output file set");
					}
					return;
				} else {
					outputPaths.push(outputModule.fsName);
				}
			}
			var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
			var dependencies = findJobAttachments(rqi.comp);//list of filenames


			function generateBundle(){
				var bundleRoot = new Folder(Folder.temp.fsName + "/DeadlineCloudAESubmission");//forward slash works on all operating systems
				recursiveDelete(bundleRoot);
				bundleRoot.create();

				var jobTemplateSourceFolder = new Folder(scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate");
				if(!jobTemplateSourceFolder.exists){
					adcAlert("Error: Missing job template at " + jobTemplateSourceFolder.fsName);
					return null;
				}

				recursiveCopy(jobTemplateSourceFolder, bundleRoot);

				var template = new File(bundleRoot.fsName + "/template.yaml");
				template.open('r');
				var templateContents = template.read();
				templateContents = templateContents.replace("{{JOBNAME}}", File.decode(app.project.file.name) + " [" + rqi.comp.name + "]");
				template.close();
				template.remove();
				template.open('w');
				template.write(templateContents);
				template.close();

				var sanitizedOutputs = sanitizeOutputs(outputPaths);

				var jobAttachmentsContents = jobAttachmentsJson(dependencies, sanitizedOutputs);
				var attachmentJson = new File(bundleRoot.fsName + "/asset_references.json");
				attachmentJson.open('w');
				attachmentJson.write(jobAttachmentsContents);
				attachmentJson.close();

				var startFrame = Number(timeToFrames(Number(renderSettings["Time Span Start"]), Number(renderSettings["Use this frame rate"])));
				var endFrame = Number(timeToFrames(Number(renderSettings["Time Span End"]), Number(renderSettings["Use this frame rate"]))) - 1;//end frame is inclusive so we subtract 1
				var parametersContents = parameterValues(renderQueueIndex, app.project.file.fsName, sanitizedOutputs, startFrame, endFrame, framesPerTask, multiFramePercentage);
				var parametersJson = new File(bundleRoot.fsName + "/parameter_values.json");
				parametersJson.open('w');
				parametersJson.write(parametersContents);
				parametersJson.close();

				return bundleRoot;
			}

			var bundle = generateBundle();

			//Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
			// The following commented-out line will block the UI until the submission window is closed, but it doesn't require extra permissions
			// systemCallWithErrorAlerts("deadline bundle gui-submit \"" + bundle.fsName + "\"")
			if($.os.toString().slice(0, 7) === "Windows"){
				var submitScript = new File(Folder.temp.fsName + "/submit.bat");
				var submitScriptContents = "deadline bundle gui-submit \"" + bundle.fsName + "\"";
				submitScript.open('w');
				submitScript.write("deadline bundle gui-submit \"" + bundle.fsName + "\"");
				submitScript.close();
				submitScript.execute();
			} else {//On mac we fall back to directly calling the command to get around file execute permission errors
				systemCallWithErrorAlerts("deadline bundle gui-submit \"" + bundle.fsName + "\"")
			}
		}

		function systemCallWithErrorAlerts(cmd){
			var output = "";
			if($.os.toString().slice(0, 7) === "Windows"){
				var tempBatFile = new File(Folder.temp.fsName + "/DeadlineCloudAESubmission.bat");
				tempBatFile.open("w");
				tempBatFile.writeln("@echo off");
				tempBatFile.writeln("echo:"); //this empty print statement is required to circumvent a weird bug
				tempBatFile.writeln(cmd);
				tempBatFile.writeln("IF %ERRORLEVEL% NEQ 0 (");
				tempBatFile.writeln(" echo ERROR CODE: %ERRORLEVEL% ");
				tempBatFile.writeln(")");
				tempBatFile.close();

				output = system.callSystem(tempBatFile.fsName);
			} else {//Mac
				output = system.callSystem(cmd + " || echo \"\nERROR CODE: $?\"");
			}

			if(output.indexOf("\nERROR CODE: ", 0) >= 0){
				adcAlert("ERROR: Command failed!\n\nFull Command:\n" + cmd + "\n" + output + "\n\nEnsure the command can be run manually in a non-elevated command prompt or terminal and try again.");
			}
		}

		function findJobAttachments(rootComp){
			//Breadth first sweep through the root composition to find all footage references
			//More efficient than just iterating through items in the project when there is a lot of unused footage in the project
			if(rootComp == null){
				return [];
			}
			var attachments = [];
			var exploredItems = {};//using this object as a set because AE doesn't support sets
			attachments.push(app.project.file.fsName);
			exploredItems[rootComp.id] = true;
			var queue = [rootComp];
			while(queue.length > 0){
				var comp = queue.pop();
				for(var i = 1; i <= comp.numLayers; i++){
					var layer = comp.layer(i);
					var shouldShowPopup = true; //only show the popup once per comp so the user doesn't get spammed if there's a lot of missing media
					if(layer != null && layer instanceof AVLayer && layer.source != null){
						var src = layer.source;
						if(src.id in exploredItems){
							continue;
						}
						exploredItems[src.id] = true;
						if(src instanceof CompItem){
							queue.push(src);
						} else if(src instanceof FootageItem && src.mainSource instanceof FileSource){
							if(src.footageMissing){
								if(shouldShowPopup)
								{
									adcAlert("Missing Footage: " + src.name + " (" + src.missingFootagePath + ")");
									shouldShowPopup = false;
								}
							} else {
								attachments.push(src.file.fsName);
							}
						}
					}
				}
			}
			return attachments;
		}

		function recursiveDelete(folder){
			//AE's internal getFiles() returns null objects for some reason so we need to use system calls
			if(folder == null || !folder.exists){
				return;
			}
			var command;
			if(Folder.fs == "Windows"){
				command = "cmd.exe /c \"rmdir /s /q \^\"" + folder.fsName + "\^\"\"";
			} else {
				command = "/bin/sh -c 'rm -rf \"" + folder.fsName + "\"'";
			}
			system.callSystem(command);
		}

		function recursiveCopy(src, dst){
			//AE's internal getFiles() returns null objects for some reason so we need to use system calls
			if(src == null || !src.exists || dst == null || !dst.exists){
				return;
			}
			var command;
			if(Folder.fs == "Windows"){
				command = "cmd.exe /c \"robocopy /s \^\"" + src.fsName + "\^\" \^\"" + dst.fsName + "\^\"\"";
			} else {
				command = "/bin/sh -c 'cp -r \"" + src.fsName + "\" \"" + dst.fsName + "\"'";
			}
			system.callSystem(command);
		}

		function getMethods(obj) {
		  var result = [];
		  for (var id in obj) {
			try {
			  if (typeof(obj[id]) == "function") {
				result.push(id + ": " + obj[id].toString());
			  }
			} catch (err) {
			  result.push(id + ": inaccessible");
			}
		  }
		  return result;
		}

		function getVariables(obj) {
		  var result = [];
		  for (var id in obj) {
			try {
			  if (typeof(obj[id]) != "function") {
				result.push(id + ": " + obj[id].toString());
			  }
			} catch (err) {
			  result.push(id + ": inaccessible");
			}
		  }
		  return result;
		}

		function getKeys(obj){
		  var result = [];
		  for (var id in obj) {
			result.push(id);
		  }
		  return result;
		}

		function isSecurityPrefSet()
		{
			var securitySetting = app.preferences.getPrefAsLong("Main Pref Section", "Pref_SCRIPTING_FILE_NETWORK_SECURITY");
			return (securitySetting == 1);
		}

		if (isSecurityPrefSet()) {
			var ui = buildUI(thisObj);
		} else {
			//Print an error message and instructions for changing security preferences
			var submitterPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Submit Queue to AWS Deadline Cloud", undefined, {resizable:true, closeButton:true});
			var root = submitterPanel.add("group");
			root.orientation = "column";
			root.alignment = ['fill', 'fill'];
			root.alignChildren = ['fill', 'top']
			var errorText = root.add("statictext", undefined ,"", {multiline:true});
			errorText.graphics.foregroundColor = errorText.graphics.newPen(errorText.graphics.PenType.SOLID_COLOR,[1.0,0.2,0.2], 1);
			errorText.text = "⚠ ERROR: Insufficient Script Permissions ⚠";
			var errorText2 = root.add("statictext", undefined ,"", {multiline:true});
			errorText2.text = ["Please allow script networking and file access:",
				"  1)  Go to \"Edit > Preferences > Scripting & Expressions\"",
				"  2)  Check \"Allow Scripts to Write Files and Access Network\"",
				"  3)  Close this window and try again.",
			].join("\n");
			errorText2.alignment = ["fill", "fill"];
			errorText2.minimumSize.height = 300;

			submitterPanel.layout.layout(true);
			submitterPanel.onResizing = function(){
				this.layout.resize();
			}
		}

		function timeToFrames(time, fps){
			//temporarily change display format so we can convert seconds to frames
			//We could perform the math ourselves, but using After Effects's internal methods ensure that we don't lose precision due to floating point errors
			var prevFrameDisplay = app.project.timeDisplayType;
			var prevFeetFrames = app.project.framesUseFeetFrames;
			app.project.timeDisplayType = TimeDisplayType.FRAMES;
			app.project.framesUseFeetFrames = false;
			var frame = timeToCurrentFormat(time, fps, false);
			app.project.timeDisplayType = prevFrameDisplay;
			app.project.framesUseFeetFrames = prevFeetFrames;
			return frame;
		}

		function parameterValues(renderQueueIndex, projectFile, outputPaths, startFrame, endFrame, framesPerTask, multiFramePercentage){
			var frameStarts;
			var frameEnds;
			var re = new RegExp(".*\[#+\].*");//checks for output patterns with [####] in them which usually indicates an image sequence
			var isSequence = false;
			for(var i = 0; i < outputPaths.length; i++){
				isSequence = re.test(outputPaths[i]);
				if(isSequence){
					break;
				}
			}

			var outputPathStr = outputPaths.join(",");
			if(framesPerTask < 1 || !isSequence){
				frameStarts = startFrame.toString();
				frameEnds = endFrame.toString();
			} else if(framesPerTask == 1){
				frameStarts = startFrame.toString() + "-" + endFrame.toString();
				frameEnds = frameStarts;
			} else {
				var frame = startFrame;
				var startArray = [];
				var endArray = [];
				while(frame <= endFrame){
					startArray.push(frame.toString());
					frame = Math.min(endFrame + 1, frame + framesPerTask);
					endArray.push((frame - 1).toString());
				}
				frameStarts = startArray.join(",");
				frameEnds = endArray.join(",");
			}

			return JSON.stringify({
				parameterValues:[
					{
						name: "CondaPackages",
						value: "aftereffects"
					},
					{
						name: "deadline:targetTaskRunStatus",
						value: "READY"
					},
					{
						name: "deadline:maxFailedTasksCount",
						value: 20
					},
					{
						name: "deadline:maxRetriesPerTask",
						value: 5
					},
					{
						name: "deadline:priority",
						value: 50
					},
					{
						name: "ProjectFile",
						value: projectFile
					},
					{
						name: "RenderQueueIndex",
						value: renderQueueIndex
					},
					{
						name: "OutputFiles",
						value: outputPathStr
					},
					{
						name: "FrameStarts",
						value: frameStarts
					},
					{
						name: "FrameEnds",
						value: frameEnds
					},
					{
						name: "MultiFrameMaxCPU",
						value: multiFramePercentage
					},
				]
			});
		}

		function sanitizeOutputs(outputPaths){
			var sanitized = []
			for(var i = 0; i < outputPaths.length; i++){
				var sanitizedPath = outputPaths[i].replace(/^\s+/,'').replace(/\s+$/,'').replace(/([\/\\])\s+/,"$1").replace(/\s+([\/\\])/,"$1");
				if(sanitizedPath){
					sanitized.push(sanitizedPath);
				}
			}
			return sanitized;
		}

		function jobAttachmentsJson(inputFiles, outputFolders){
			return JSON.stringify({
				assetReferences: {
					inputs: {
						directories: [],
						filenames: inputFiles,
					},
					outputs: {
						directories: outputFolders
					},
					referencedPaths: [],
				},
			});
		}

		//minified version of JSON2(https://github.com/douglascrockford/JSON-js) which is public domain
		if(typeof JSON!=="object"){JSON={}}(function(){"use strict";function f(e){return e<10?"0"+e:e}function quote(e){escapable.lastIndex=0;return escapable.test(e)?'"'+e.replace(escapable,function(e){var t=meta[e];return typeof t==="string"?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function str(e,t){var n,r,i,s,o=gap,u,a=t[e];if(a&&typeof a==="object"&&typeof a.toJSON==="function"){a=a.toJSON(e)}if(typeof rep==="function"){a=rep.call(t,e,a)}switch(typeof a){case"string":return quote(a);case"number":return isFinite(a)?String(a):"null";case"boolean":case"null":return String(a);case"object":if(!a){return"null"}gap+=indent;u=[];if(Object.prototype.toString.apply(a)==="[object Array]"){s=a.length;for(n=0;n<s;n+=1){u[n]=str(n,a)||"null"}i=u.length===0?"[]":gap?"[\n"+gap+u.join(",\n"+gap)+"\n"+o+"]":"["+u.join(",")+"]";gap=o;return i}if(rep&&typeof rep==="object"){s=rep.length;for(n=0;n<s;n+=1){if(typeof rep[n]==="string"){r=rep[n];i=str(r,a);if(i){u.push(quote(r)+(gap?": ":":")+i)}}}}else{for(r in a){if(Object.prototype.hasOwnProperty.call(a,r)){i=str(r,a);if(i){u.push(quote(r)+(gap?": ":":")+i)}}}}i=u.length===0?"{}":gap?"{\n"+gap+u.join(",\n"+gap)+"\n"+o+"}":"{"+u.join(",")+"}";gap=o;return i}}if(typeof Date.prototype.toJSON!=="function"){Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null};String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(){return this.valueOf()}}var cx,escapable,gap,indent,meta,rep;if(typeof JSON.stringify!=="function"){escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;meta={"\b":"\\b","	":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};JSON.stringify=function(e,t,n){var r;gap="";indent="";if(typeof n==="number"){for(r=0;r<n;r+=1){indent+=" "}}else if(typeof n==="string"){indent=n}rep=t;if(t&&typeof t!=="function"&&(typeof t!=="object"||typeof t.length!=="number")){throw new Error("JSON.stringify")}return str("",{"":e})}}if(typeof JSON.parse!=="function"){cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;JSON.parse=function(text,reviver){function walk(e,t){var n,r,i=e[t];if(i&&typeof i==="object"){for(n in i){if(Object.prototype.hasOwnProperty.call(i,n)){r=walk(i,n);if(r!==undefined){i[n]=r}else{delete i[n]}}}}return reviver.call(e,t,i)}var j;text=String(text);cx.lastIndex=0;if(cx.test(text)){text=text.replace(cx,function(e){return"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})}if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))){j=eval("("+text+")");return typeof reviver==="function"?walk({"":j},""):j}throw new SyntaxError("JSON.parse")}}})()

		//Binary data for the Deadline Cloud logo
		function logoData() {
			return "\u0089PNG\r\n\x1A\n\x00\x00\x00\rIHDR\x00\x00\x00 \x00\x00\x00 \b\x02\x00\x00\x00\u00FC\x18\u00ED\u00A3\x00\x00\x00\tpHYs\x00\x00\x17\u009F\x00\x00\x17\u009F\x01K\u009C3R\x00\x00\x00\x19tEXtSoftware\x00www.inkscape.org\u009B\u00EE<\x1A\x00\x00\x05\u008CIDATH\u00C7uVilTU\x14\u00FE\u00CE\u009B\u00D7Y\u0099\u00EECiR\x02B\u0084H\n\"P\u0091}QQ\tT\x14\u00A5\x14!\"FH\u0091\x02)5\u00FC!1\x18\x13PP\x14\u00C5\x10!\u0080&\u0084E\x01\u00A51\u0090\u00B2\x05e\u0084\x10\u00DB\u008AHY\\J)e)\u00C5af\u00DA\u00E9L\u00DF\u00CC\x1C\x7F\u00DC\u00B7\u00CE\u00B4\u00FF\u00EE\u00BB\u00EFl\u00F7\u00DC\u00F3}\u00F7\u00A3\u00A6U\u00D9D\x001\x11\u0088@\u00C4 \x101\x11\u00F4\x05A7\x10\x7F\u00D3\fL\u00FBV\x03\u0096\u0099\x01\u0080@\f\x06\x00\x10\u0081\x19\x040\x01\x10\u00FB\u00A4\x1B\x10\u0081!\u00B6T\x03\u00E1&\u00BC\u00D4\u0085\u00B6\t\x02\u00C9\x001\u00B3\u00F8\u0080\u00C9H\u00840\u00E7\u00D6\u00C2\x11\u0088\tj\x0Epzh\u0091[\u00F5\u0092\u0099Ad\r\u00AD\u009EI+\u00DF\u00C8\u00ADVm9\x1F\u00B1Q>\u00EB\x06\u00D0\u00BDdp\u00DA\x19\u0089\u008D\u00D0\u00AC\u00B7\x0E\u00A9\u00A1\u00B5c\x19\u00E5\u0093Q>\u00D4BIb&0\u0098!\x16\u00DA\x1A`b-\u00B78\u00B8\\4&o\u00F9\u00CF\u00B9\u00CB\u00FDr\u00FF\u00B1\u0086\u0081\u00E1Elrg\x16^\u0090t#6\u008CH\u00CF!\u00F6\u00C9\u0099\u009D5\u00E7\u00B3\u00FC\u008AS$;\u00C8\u0096\u0091\u00FB\u00CE\t\u00EF\u009C/\u00C9\u0095\u009B\x16\u009A\u00CC^\"\u00ACme\u0089\x0B\x04q\x0F\u00E2\x1AE\u00FB\u00D45I\u009E\u00D1\u00F3\u00F3\x17\u00EF\u00B7\u00F7\x1F\u00DDq\u00E6\u0093\u00E0\u00C1\u00A5\u009D\x17wr\u00F4\u0091\u00E7\u0099\n\u00D7\u00D8eH\u00C4\u0094\u00D6:\x02\x0BWS\x042\x167*\u00F2R\u0086\x1A\u00DA\u00EC\u00DB\x0B\u0087\u00E6\u00BE\u00F6\u00A9c\u00D0\u00F8\u00AE?k\u0082G\u00D7&\u0082\u00B7\u00C9&K\u0092\u00C4\u00C9\u0098\u009C]\u00949\u00EB#\u00C7\u00B0R\u00A5\u00F9|\u00C7O\u00AB\x12mWL\u008E\x16(\u00D8*\u00C7\u00B8\u00F5\u00FCz\u00F9\u0092\u00DD\u00955\u00A3:\x7F\u00E1\u00D7\x00\x1E\u00EE[\x1A:\u00B9\u0089\u00A3a\u00D7\x13/\u00E5/9\u00E4\u0099T\u0099\u00EC|\u00A8\u00DC\u00F4G/\x1FV\u009A\u00FD\u00CE\u00E1\u00AF\u00BA'U\u0093+Oi9\u008FD\u00B7:%\u00A2\x03D \u00D0\u00F5ey)\u0098t\x0Ez\u00BA\u00EF\u00E2\u009D6\u00AF/x\u00FA\u008B\u00D0\u00A9\u00CD\u0088G\u00E5\u009C\u00A2\u009C9\x1B]\u00C5\u00B3\u00A2W\u008F!\u00A18\u008BKc\u00D7kC5\u00D5\u0089@\u0093dwz\u00A6T\u00BB'\u00AE\u00E6H{\u00F8\u00FB\u00C5\u00F1\x16\x7F\n\u00D4m+\u00C6xR\u00DA\u00973cuF\u00C1\u0090\u00BB[^\u0088\\\u00FA\u0081H\u00F2N}\u00D7\u00F7\u00E67\u00E4\u00CC\u00FC\u00EF@E\u00E8\u00C4\u0086\u00AE?\u008E\u00C4o\u00D7\u00B9G\u0095{&\u00AF&\u0092\u0094\u00E6\x0B\u00DD\u00FF\u009C\u008E]9\u00E2zj\x01\u00C9\u00AE\u00EE\x1B\u00C7\u00B4PjWd\x15\u008C\x1A\r\u0088\u00F9\u0089\x07Z\u0095\u00FB\x7F;\x1E+\u00F1\u0095o\u0095}\u0083\u00C3g\u00B7\x05O|\f%\"\u00C0\u00DAu\u00AD6\u00F6\u00EFX\u00EF\u00B45\u009E\u00A9\u00EF9G\u00CE\x0F\u00FFX\u00D9}\u00F3\u0097D\u00F0\u00B6\x00z\n\x1E%1a0\r/4\u0086\u00C9/\u00DB\u00C2\t\u00E5\u00CE\u00A6\u00C9\u0081\u009A\u00F5\x1C\u008B\u0098\x06\u009A\u0092\u00DD]\u00A1\u00DA\x0F\u00DB\u00B7\u008E\u00E7h0\u00F3\u0095\u00AF\x04^X\u00C30\u0083\u00F4\u00B0\u0092\x19/\u00E6\x1C\u00CC\x00\u00D9\"\u008D'\u0095{\u00D7\x18*L5|\u00A8XQ\u00DA\u00FE\u008A^\u00AB\u0085dS\u00E1\x06\x03\x13\x00\t/\u0089\u00CD\u00E5k\u00FF\x00\u009D+M\u00B9\u00D5k\"\x06\u00E4\u0082a\u0094\u00E1a\x06\u008B\u00C9\x11^\u00A6\u00DCzX\u00D9`\x12\u00D6\tR\u00FD\u00A7\u00F6\u0094\u00CDL\x05\u009B\u00B7 {\u00F6z\u00CF\u00A8\u00B2D\u00E8n\u00E8\u00F8\x07\x1Dg?O<ja6u\x06\x16n7\u00C8N'a\u0086A\u00F3jg\u00B4\u00F1\u00F6NX\u0092=s\x1D\u00C7c\u0081\u00C3U\u00CE\u00A1\u00CF\u00E6\u0094mw\u008Dx9x\u00B4\u00DA\u00F02\u00C8_\u00F5\u0092\u00D2\u00D9\n:\u00EF3;\u008A\u008A\u00C9\u00D1G\x18\u00B8G\u0094\u00E6\u00CE\u00DD\u00D4Y\x7F\u00E8\u00CE\u00C6\u0092\u00F0\u00AF\u00BB\u00DB\u00F7,l\u00DFU\u0096Q8<g\u00FE.X\u008F\u00AB\u00DE\x19\u00D4KNg+\u00F5\u0092\x03\u00A7\u00B7;\x07\u008F\u00EB\u00BF\u00EE\u0082{d)\x03\u00E4\u00F0\x00x\u00F8\u00DD\u009Ad$$bu5\x1E\u008F\u00D4\x1F$\u00BB\u0087\u00F5\u00B2\u008C)\x0031 1\u00AC\u00A1\x19\u00CCl\u00CB.\u00CC\u00C8\x1B\x10\u00F4\u00EFm^?.\u00DAT\u00D7\u00EF\u00ED=\u00CE!SL\u0087S\x0B\x14!\u00A01\u00A8:\x1A\u00D6\u008A%\u00D5H\x1B\x0Ff\n\u00FA\u00F7qwt\u00E0\u00FB\u00FE\u00DC\x17\u00AB\x12\u00E1\u00F6\u00BB;\u00DE\u00BA\u00B3m^\u00B2#\u00A0\u00DD\u008Ad\u00CC\u00AB\u00F1Z \x11\u00B8\u00D5\u00F9\u00DB^\u00D3\u00FC\u00A89l\x15O\u00F6!\u008D&\b\x04B<x?x\u00EE[p2of\u0095\u00B7d\u00AEr\u00EFF\u00E4\u00EA\u0099D\u00A8M\u00CE\u00EC\u00EB-y\u00DD\u00F5\u00F8\u00C4hs}\u00B2\u00A3]\u00B2\u00D9\u00BD\u00D3*\u00B3\u00A6\u00ADR\u00EE5v\u00D6\x1F\u00EC\u00BAR\u0093\f\u00B6\x1A\x1C\u00A7>\u0099\u00A0K\u008B\n4\u00F2\u00E3\x14=b\u00F7\r((\u00DF\u00E8)~\u00AE\u00F3r\u00ED\u0083\x03\u00D5\u00F1@\u00AB{\u00C8\x04_\u00D9f\u00D970|n\u00B7k\u00E8\x14\u00D97(t\u00E6\u008B\u00D0\u00A9\u00CDP\u00BAz\u00D6;\x04[\u00C5\b\u00AFQ\u00BE\u0089\u00A4\x00JF\x1E\u0085/\x1E\u008A\u00B5\\\u00CA\x1C_\u009E\u00F3\u00FCJp2\\w8\u00EC\u00DF\u00C3\u00D1`\u00D6\u00F4\x15\u00F1\u00F6\u00A6\u00B6\u009D\u00E5\u0091\u0086#H(\u00A6GF\x7Fy\u00B4\u00AE\u00FC\u00BE\u00B0\u009FZ>z\u00C8/\u008Ees\u00BA\u00F3f\u00AF\u00CD\u009E\u00BE\u00B4\u00BB\u00B5\u00F1\u00C1\u00FE\u00AA\u00D8\u00AD\x06\u00C9\u00EE@<\u00AA?M\u00E6\u00F2\u00CD2\x0E\u00C4\u00D4\u00F0F\u00BF\x1E4\x1Dz\u0090l\u00CE\u00A2a\u00BEy\x1B\u00C0\u00C9{;\x16%c!\u00EAE\u00CA\u0089[0\u00A4b\u00C3\u0082\u00C2\u00DE\u00DA\u00D7\u00E3\x13\u00D8\u00BB\\L-\u009FH\x13^=\u00CBE\x1D\u00EEd\u0095l\u00DC\u009B\\4T\u009A\u00A1B\u0089e\u00E8\u00A2\u00CE*\u00E5\f%\n\u00EB\x1Bb\u0095r)J\u00D4\u00AA\x04\x01@6\u0098\u00C7*\u00E5\u00C8\u00B4o\u00D5t=K\u00B9\u00DE\x04\u00AEl\u00C0?MH\u008B\u00D7'\u00ADuFg,J\u00B4\x17\u0081\u00FB?\x0B\u00ED\u00A7Pm-\u00EE\x14\x00\x00\x00\x00IEND\u00AEB`\u0082"
		};
	}

	SubmitQueueToDeadlineCloud(this);
}
