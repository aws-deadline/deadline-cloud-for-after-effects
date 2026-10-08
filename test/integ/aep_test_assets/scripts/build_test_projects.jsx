/**
 * build_test_projects.jsx
 *
 * Builds the After Effects SMF test-artifact superset: one .aep per test case
 * from the "After Effects SMF Test Coverage" matrix. Each project:
 *   - imports the relevant versioned source footage (job-attachment coverage)
 *   - burns the test id / name / asset version / description into the frame
 *   - adds its composition(s) to the render queue with the intended output module
 *   - is saved under projects/ae<major>/
 *
 * Run once per installed AE version (25xx and 26xx). Determinism: no random or
 * time-of-day values are used, so renders are frame-reproducible for diffing.
 */

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------
var ASSET_VERSION = "1.0.0";
var HOME = Folder("~").fsName;

// Asset root: the folder above this script (test/integ/aep_test_assets). Overridden
// by run_build.py's config file or AE_TEST_ASSETS.
var ROOT = File($.fileName).parent.parent.fsName.replace(/\\/g, "/");
try {
    var rootEnv = $.getenv("AE_TEST_ASSETS");
    if (rootEnv) { ROOT = String(rootEnv).replace(/\\/g, "/").replace(/\/+$/, ""); }
} catch (e) {}
// run_build.py also writes its settings to a file, because on macOS AE is started
// with `open -a`, which does not pass the caller's environment through.
var BUILD_CFG = {};
try {
    var cfgFile = new File(Folder.temp.fsName + "/ae_build_projects.config.json");
    if (cfgFile.exists) {
        cfgFile.open("r");
        BUILD_CFG = eval("(" + cfgFile.read() + ")") || {};
        cfgFile.close();
    }
} catch (e) {}
if (BUILD_CFG.root) { ROOT = String(BUILD_CFG.root).replace(/\\/g, "/").replace(/\/+$/, ""); }
var SRC = ROOT + "/source_assets";

var VID     = SRC + "/video/plate_motion_1080p30_v" + ASSET_VERSION + ".mp4";
var AUD_WAV = SRC + "/audio/tone_48k_stereo_v" + ASSET_VERSION + ".wav";
var AUD_MP3 = SRC + "/audio/tone_48k_stereo_v" + ASSET_VERSION + ".mp3";
var STILL   = SRC + "/images/still_ref_1080p_v" + ASSET_VERSION + ".png";
var SEQ1    = SRC + "/image_sequences/seq_1080p_v" + ASSET_VERSION + "/seq_v" + ASSET_VERSION + "_0001.png";
var SPECIAL = SRC + "/special_characters/plate_ñ=+-_v" + ASSET_VERSION + ".png";

// Fonts (PostScript names verified on this machine)
var FONT_EMBER   = "AmazonEmber-Regular";   // supported, installed
var FONT_CC      = "Komet-Regular";          // supported, Creative Cloud activated
var FONT_MISSING = "NotInstalledFont-Regular"; // deliberately absent -> error path

// AE version detection
var AE_MAJOR = parseInt(app.version, 10);          // e.g. 25 or 26
var AEV = "ae" + (2000 + AE_MAJOR);                 // ae2025 / ae2026
var PROJDIR = ROOT + "/projects/" + AEV;
var RENDERBASE = ROOT + "/renders/" + AEV;

var W = 1920, H = 1080, FPS = 30, PAR = 1.0;
var LOG = [];

// Ensure scripts may write files (needed to save .aep / logs). Per-AE-version
// preference; safe to set every run.
try {
    app.preferences.savePrefAsLong("Main Pref Section v2",
        "Pref_SCRIPTING_FILE_NETWORK_SECURITY", 1,
        PREFType.PREF_Type_MACHINE_INDEPENDENT);
    app.preferences.saveToDisk();
} catch (e) {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureFolder(p) { var f = new Folder(p); if (!f.exists) f.create(); return f; }

function startProject() {
    if (app.project) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
    app.newProject();
    return app.project;
}

function saveProject(fileName) {
    ensureFolder(PROJDIR);
    var f = new File(PROJDIR + "/" + fileName);
    app.project.save(f);
    return f.fsName;
}

function addBackground(comp, rgb) {
    return comp.layers.addSolid(rgb, "Background", comp.width, comp.height, 1.0);
}

// Multi-line info text layer, top-left anchored.
function addInfoText(comp, lines, fontPS, size, color, x, y) {
    var layer = comp.layers.addText(lines.join("\r"));
    var p = layer.property("Source Text");
    var td = p.value;
    td.fontSize = size || 54;
    td.fillColor = color || [1, 1, 1];
    var want = fontPS || FONT_EMBER;
    try { td.font = want; } catch (e) {}
    td.justification = ParagraphJustification.LEFT_JUSTIFY;
    p.setValue(td);
    // A missing font is silently substituted, which would quietly change what the
    // font cases test. Only FONT_MISSING may be absent, on purpose.
    if (want !== FONT_MISSING && p.value.font !== want) {
        throw new Error("font " + want + " not available (got " + p.value.font + ")");
    }
    // anchor point to top-left of text box so x/y are predictable
    layer.property("Position").setValue([x || 120, y || 200]);
    return layer;
}

// Standard burned-in test banner shared by every comp.
function bannerLines(testId, testName, descLines) {
    var base = [
        testId + "  |  " + testName,
        "asset v" + ASSET_VERSION + "   " + AEV.toUpperCase(),
        "mac -> Windows SMF   Deadline Cloud AE E2E"
    ];
    if (descLines) { for (var i = 0; i < descLines.length; i++) base.push(descLines[i]); }
    return base;
}

function importFootage(path) {
    var f = new File(path);
    if (!f.exists) { throw new Error("missing source: " + path); }
    return app.project.importFile(new ImportOptions(f));
}

function importSequence(firstFramePath) {
    var f = new File(firstFramePath);
    if (!f.exists) { throw new Error("missing sequence: " + firstFramePath); }
    var io = new ImportOptions(f);
    try { io.sequence = true; } catch (e) {}
    return app.project.importFile(io);
}

// --- Output-module specs ---------------------------------------------------
//
// An output module's format can ONLY be changed by applying a template: the
// "Format" key returned by getSettings() is read-only, so setSettings({Format:
// ...}) raises "Invalid Value for key: <Format>. Property is read-only". That
// restricts us to the templates AE ships, and AE ships NO JPEG Sequence, PNG
// Sequence or MP3 template -- so the formats this suite originally asked for are
// unreachable without authoring templates into user prefs (not portable).
//
// The reachable built-ins on AE 2025 (12 non-hidden templates) are:
//   AIFF 48kHz -> AIFF (audio only)      Lossless[ with Alpha] -> AVI
//   Alpha Only -> AVI                    Multi-Machine Sequence -> Photoshop Seq
//   H.264 - Match Render Settings -> H.264   Photoshop -> Photoshop Sequence
//   High Quality[ with Alpha] -> QuickTime   TIFF Sequence with Alpha -> TIFF Seq
//
// So an image sequence is TIFF and audio is AIFF. TIFF is in fact better than
// the JPEG/PNG originally intended: lossless and per-frame, which is what output
// diffing needs. Each spec lists candidate template names in priority order
// (names vary slightly between AE releases) plus the format that must result.
var OM_H264 = {
    templates: ["H.264 - Match Render Settings - 15 Mbps",
                "H.264 - Match Render Settings - 5 Mbps"],
    format: "H.264"
};
var OM_SEQUENCE = { templates: ["TIFF Sequence with Alpha"], format: "TIFF Sequence" };
var OM_AUDIO    = { templates: ["AIFF 48kHz"],               format: "AIFF" };

// Collapse runs of whitespace: AE's own template names contain inconsistent
// double spaces ("- <sp><sp>5 Mbps"), so an exact string compare misses them.
function normTemplateName(s) {
    return String(s).toLowerCase().replace(/\s+/g, " ");
}

// Add comp to render queue, apply the output-module template named by `spec`,
// then set the output path. Returns the render-queue item.
//
// Throws if no candidate template exists or if the resulting format is not the
// one the spec asked for. The previous version matched templates by keyword and
// silently kept the default (H.264) when nothing matched, which is how T07
// (MP3), T08 (JPEG sequence) and T19-emit (PNG sequence) all ended up rendering
// .mp4 while their filenames still claimed .mp3/.jpg/.png. A silent fallback
// here produces assets that look right and test the wrong thing, so it is now
// a hard build failure recorded in the per-version build log.
function queueRender(comp, testId, spec, outLeaf) {
    var rqi = app.project.renderQueue.items.add(comp);
    var om = rqi.outputModule(1);
    var available = om.templates; // array of available template names

    var applied = null;
    for (var i = 0; i < spec.templates.length && applied === null; i++) {
        var want = normTemplateName(spec.templates[i]);
        for (var j = 0; j < available.length; j++) {
            if (normTemplateName(available[j]) === want) {
                om.applyTemplate(available[j]);
                applied = available[j];
                break;
            }
        }
    }
    if (applied === null) {
        throw new Error("no output-module template for " + spec.format
            + " (wanted one of: " + spec.templates.join(", ")
            + "; AE offers: " + available.join(", ") + ")");
    }

    var outDir = RENDERBASE + "/" + testId;
    ensureFolder(outDir);
    om.file = new File(outDir + "/" + outLeaf);

    // Verify the template actually produced the intended format, and that
    // assigning om.file did not rewrite it (setting a "[#####]" path on a
    // sequence template keeps the sequence; a mismatched extension would not).
    var got = om.getSettings(GetSettingsFormat.STRING)["Format"];
    if (got !== spec.format) {
        throw new Error("output module for " + comp.name + " is " + got
            + ", expected " + spec.format + " (template " + applied + ")");
    }

    LOG.push("  RQ: " + comp.name + "  template=" + applied
             + "  format=" + got + "  out=" + outLeaf);
    return rqi;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

// Simple single-comp project (bg + banner + still) rendered to H.264.
function buildBasic(testId, slug, testName, descLines) {
    startProject();
    var comp = app.project.items.addComp(testId + " " + slug, W, H, PAR, 5, FPS);
    addBackground(comp, [0.07, 0.10, 0.18]);
    var still = importFootage(STILL);
    if (still) { var l = comp.layers.add(still); l.property("Opacity").setValue(22); }
    addInfoText(comp, bannerLines(testId, testName, descLines), FONT_EMBER, 56, [1,1,1], 120, 300);
    comp.openInViewer();
    queueRender(comp, testId, OM_H264, testId + "_" + AEV + ".mp4");
    var f = saveProject(testId + "_" + slug + "_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Video + custom fonts (T06) and supported-fonts-only (T21).
function buildFonts(testId, slug, testName, includeMissing) {
    startProject();
    var comp = app.project.items.addComp(testId + " " + slug, W, H, PAR, 6, FPS);
    addBackground(comp, [0.05, 0.07, 0.12]);
    var vid = importFootage(VID);
    if (vid) { var vl = comp.layers.add(vid); vl.property("Opacity").setValue(35); }

    addInfoText(comp, bannerLines(testId, testName), FONT_EMBER, 46, [1,1,1], 120, 150);

    var fonts = [
        ["Amazon Ember (supported, installed)", FONT_EMBER,   [1.0, 0.85, 0.3]],
        ["Komet (supported, Creative Cloud)",   FONT_CC,      [0.5, 0.9, 1.0]]
    ];
    // No .ttc row: macOS's AmericanTypewriter.ttc fails to load on the Windows
    // fleet and hard-fails the job (RENDER_FINDINGS #3).
    if (includeMissing) {
        fonts.push(["Missing font -> expect submitter error", FONT_MISSING, [1.0, 0.5, 0.5]]);
    }
    var y = 430;
    for (var i = 0; i < fonts.length; i++) {
        addInfoText(comp, [fonts[i][0]], fonts[i][1], 70, fonts[i][2], 120, y);
        y += 150;
    }
    comp.openInViewer();
    queueRender(comp, testId, OM_H264, testId + "_" + AEV + ".mp4");
    var f = saveProject(testId + "_" + slug + "_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Audio render (T07): audio footage + banner, queued to an audio-only module.
// AIFF, not the MP3 the coverage matrix names: AE ships no MP3 output-module
// template and the format cannot be set by script (see OM_* above). AIFF is the
// only audio-only built-in, and it exercises the same path -- Video Output off,
// Output Audio on -- which is what the case is actually about.
function buildAudio() {
    var testId = "T07";
    startProject();
    var comp = app.project.items.addComp(testId + " audio_render", W, H, PAR, 6, FPS);
    addBackground(comp, [0.10, 0.06, 0.14]);
    var aud = importFootage(AUD_MP3);
    if (aud) { comp.layers.add(aud); }
    addInfoText(comp, bannerLines(testId, "Audio Rendering",
        ["Output Module: AIFF 48kHz (audio only)", "verify Audio Output = ON"]),
        FONT_EMBER, 54, [1,1,1], 120, 320);
    comp.openInViewer();
    queueRender(comp, testId, OM_AUDIO, testId + "_" + AEV + ".aif");
    var f = saveProject(testId + "_audio_render_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Burned-in "frame NNNNN" counter. Every frame of a sequence comp must differ in
// pixels: the output layer asserts sampled frames are distinct.
function addFrameCounter(comp) {
    var counter = comp.layers.addText("frame 00000");
    var src = counter.property("Source Text");

    // Style before setting the expression, never after. Reading `.value` back off a
    // property that already carries an expression evaluates that expression, and
    // timeToFrames() needs a time context -- so with no comp open in a viewer AE
    // raises "internal verification failure ... {no current context}" and the whole
    // build of this project fails. Harmless interactively (a viewer from the
    // previous comp supplies a context), fatal when driven headlessly.
    var ctd = src.value;
    ctd.fontSize = 140;
    ctd.font = FONT_EMBER;
    ctd.fillColor = [1, 0.85, 0.3];
    src.setValue(ctd);

    // Zero-padded so lexical order matches frame order, matching the [#####]
    // padding of the output filenames.
    src.expression =
        "f = timeToFrames();" +
        "p = \"00000\" + f;" +
        "\"frame \" + p.substr(p.length - 5);";

    counter.property("Position").setValue([W/2 - 300, H/2 + 200]);
    return counter;
}

// Image chunking (T08): 300 frames, image-sequence output. The sequence output is
// load-bearing, not cosmetic: the submitter only declares the ChunkSize job
// parameter when the selection contains an image sequence, so with a video output
// module framesPerTask is inert and the case proves nothing about chunking.
// TIFF rather than the matrix's JPEG -- the only image-sequence built-in (see OM_*).
function buildChunking() {
    var testId = "T08";
    startProject();
    var dur = 300 / FPS; // 300 frames @30fps = 10s
    var comp = app.project.items.addComp(testId + " image_chunking_300f", W, H, PAR, dur, FPS);
    addBackground(comp, [0.06, 0.12, 0.10]);
    addInfoText(comp, bannerLines(testId, "Image Chunking (300 frames)",
        ["Frames Per Task: test 1 / 100 / 299 / 300", "Output: TIFF Sequence"]),
        FONT_EMBER, 52, [1,1,1], 120, 260);
    // Moving frame counter proves per-frame chunk output ordering: with chunking on,
    // each task renders a slice of the range, so a wrong slice boundary or a
    // misordered chunk is visible in the frame rather than silently correct-looking.
    addFrameCounter(comp);
    comp.openInViewer();
    queueRender(comp, testId, OM_SEQUENCE, testId + "_" + AEV + "_[#####].tif");
    var f = saveProject(testId + "_image_chunking_300f_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Special characters (T10): comp names + imported footage filename carry
// special characters. Colon is intentionally omitted (breaks job attachments).
function buildSpecialChars() {
    var testId = "T10";
    startProject();
    var names = [
        "T10 comp_ñ_name",     // ñ
        "T10 comp=eq+plus-dash_underscore"
    ];
    for (var i = 0; i < names.length; i++) {
        var comp = app.project.items.addComp(names[i], W, H, PAR, 4, FPS);
        addBackground(comp, [0.12, 0.08, 0.06]);
        var sp = importFootage(SPECIAL);
        if (sp) { var l = comp.layers.add(sp); l.property("Opacity").setValue(30); }
        addInfoText(comp, bannerLines(testId, "Special Characters",
            ["comp name: " + names[i], "chars: ñ = + - _  (no colon)"]),
            FONT_EMBER, 50, [1,1,1], 120, 320);
        queueRender(comp, testId, OM_H264, "T10_" + (i+1) + "_" + AEV + ".mp4");
    }
    var f = saveProject(testId + "_special_characters_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Multi-frame rendering (T11): a moderately layered comp; MFR is set in submitter.
function buildMFR() {
    var testId = "T11";
    startProject();
    var comp = app.project.items.addComp(testId + " multi_frame_rendering", W, H, PAR, 5, FPS);
    addBackground(comp, [0.05, 0.09, 0.16]);
    // a few animated shape layers so there is real per-frame work
    for (var i = 0; i < 6; i++) {
        var s = comp.layers.addShape(); s.name = "spinner_" + i;
        var g = s.property("Contents").addProperty("ADBE Vector Group");
        var rect = g.property("Contents").addProperty("ADBE Vector Shape - Rect");
        rect.property("Size").setValue([180, 180]);
        var fill = g.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue([0.2 + i*0.12, 0.6, 1.0 - i*0.1]);
        s.property("Position").setValue([300 + i*230, H/2]);
        var rot = s.property("Rotation");
        rot.setValueAtTime(0, 0); rot.setValueAtTime(comp.duration, 360 * (i+1));
    }
    addInfoText(comp, bannerLines(testId, "Multi-Frame Rendering (MFR)",
        ["enable MFR + % usage in submitter", "verify aerender MFR flags in job logs"]),
        FONT_EMBER, 50, [1,1,1], 120, 200);
    comp.openInViewer();
    queueRender(comp, testId, OM_H264, testId + "_" + AEV + ".mp4");
    var f = saveProject(testId + "_multi_frame_rendering_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Timeout (T12): deliberately slow comp so a very short timeout cuts it short.
function buildTimeout() {
    var testId = "T12";
    startProject();
    // 120s, not 20s: a fast worker rendered the 20s comp in 59s, under the case's
    // 60s timeout, so the job SUCCEEDED instead of timing out.
    var comp = app.project.items.addComp(testId + " timeout", W, H, PAR, 120, FPS);
    var bg = addBackground(comp, [0.02, 0.03, 0.06]);
    // heavy effects to slow per-frame render
    try {
        var fractal = bg.property("Effects").addProperty("ADBE Fractal Noise");
        if (fractal) {
            var evo = fractal.property("Evolution");
            evo.setValueAtTime(0, 0); evo.setValueAtTime(comp.duration, 3600);
        }
        bg.property("Effects").addProperty("ADBE Gaussian Blur 2");
    } catch (e) { LOG.push("  ! T12 effect add failed: " + e.toString()); }
    addInfoText(comp, bannerLines(testId, "Timeout",
        ["submit with a very short timeout", "verify the job is cut short"]),
        FONT_EMBER, 54, [1,1,1], 120, 300);
    comp.openInViewer();
    queueRender(comp, testId, OM_H264, testId + "_" + AEV + ".mp4");
    var f = saveProject(testId + "_timeout_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Multiple comps in one project (T17 multicomp, T18 sticky settings).
function buildMultiComp(testId, slug, testName, descLines) {
    startProject();
    var colors = [[0.10,0.14,0.28],[0.14,0.10,0.24],[0.10,0.20,0.18]];
    for (var i = 1; i <= 3; i++) {
        var comp = app.project.items.addComp(testId + " comp_" + i, W, H, PAR, 4, FPS);
        addBackground(comp, colors[i-1]);
        addInfoText(comp, bannerLines(testId, testName + " (comp " + i + " of 3)", descLines),
            FONT_EMBER, 52, [1,1,1], 120, 320);
        queueRender(comp, testId, OM_H264, testId + "_comp" + i + "_" + AEV + ".mp4");
    }
    var f = saveProject(testId + "_" + slug + "_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Image sequence import (T19): one comp outputs a sequence, one imports the
// pre-generated PNG sequence and renders it to video. The emitted sequence is TIFF
// (the only image-sequence built-in, see OM_*); the imported one stays PNG because
// it is pre-generated source footage, not an output module.
function buildImageSequenceImport() {
    var testId = "T19";
    startProject();

    // (a) sequence-output comp
    var outComp = app.project.items.addComp(testId + " emit_image_sequence", W, H, PAR, 2, FPS);
    addBackground(outComp, [0.06, 0.10, 0.16]);
    addInfoText(outComp, bannerLines(testId, "Image Sequence (emit)",
        ["emits a TIFF sequence (one file per frame)"]), FONT_EMBER, 50, [1,1,1], 120, 320);
    addFrameCounter(outComp);
    queueRender(outComp, testId, OM_SEQUENCE, testId + "_emit_" + AEV + "_[#####].tif");

    // (b) sequence-import comp using the pre-generated PNG sequence footage
    var seq = importSequence(SEQ1);
    var inComp = app.project.items.addComp(testId + " import_png_sequence", W, H, PAR, 2, FPS);
    addBackground(inComp, [0.05, 0.07, 0.12]);
    if (seq) { inComp.layers.add(seq); }
    addInfoText(inComp, bannerLines(testId, "Image Sequence (import)",
        ["whole sequence must upload as job attachment", "not just the first frame"]),
        FONT_EMBER, 46, [1,1,1], 120, 180);
    queueRender(inComp, testId, OM_H264, testId + "_import_" + AEV + ".mp4");

    var f = saveProject(testId + "_image_sequence_import_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// Missing dependencies (T20): comp references external footage (still + audio).
function buildMissingDeps() {
    var testId = "T20";
    startProject();
    var comp = app.project.items.addComp(testId + " missing_dependencies", W, H, PAR, 6, FPS);
    addBackground(comp, [0.06, 0.06, 0.10]);
    var still = importFootage(STILL);
    if (still) { comp.layers.add(still); }
    var aud = importFootage(AUD_WAV);
    if (aud) { comp.layers.add(aud); }
    addInfoText(comp, bannerLines(testId, "Missing Dependencies",
        ["rename/delete the referenced footage,", "set 'continue on missing' = true, verify render"]),
        FONT_EMBER, 50, [1,1,1], 120, 320);
    comp.openInViewer();
    queueRender(comp, testId, OM_H264, testId + "_" + AEV + ".mp4");
    var f = saveProject(testId + "_missing_dependencies_" + AEV + "_v" + ASSET_VERSION + ".aep");
    LOG.push("OK  " + f);
}

// ---------------------------------------------------------------------------
// Run all builds
// ---------------------------------------------------------------------------
LOG.push("=== Building AE " + (2000 + AE_MAJOR) + " test superset (app.version " + app.version + ") ===");
LOG.push("    root = " + ROOT);

// Every builder, keyed by test id. Regenerating a project rewrites its .aep, so
// AE_BUILD_ONLY ("T07,T08") restricts the run to the ids listed -- a targeted fix
// should not resave the other fourteen projects and bloat the diff.
var BUILDS = [
    ["T05", function () { buildBasic("T05", "submit_dockable", "Submit Button + is Dockable",
        ["dock the submitter panel; select comp; submit"]); }],
    ["T06", function () { buildFonts("T06", "video_custom_fonts", "Video Rendering + Custom Fonts", true); }],
    ["T07", buildAudio],
    ["T08", buildChunking],
    ["T09", function () { buildBasic("T09", "cli_error_handling", "Deadline CLI Error Handling",
        ["remove deadline from PATH; expect submitter error"]); }],
    ["T10", buildSpecialChars],
    ["T11", buildMFR],
    ["T12", buildTimeout],
    ["T13", function () { buildBasic("T13", "env_variable", "AE Env Variable Used Correctly",
        ["host config points AE env var to custom location"]); }],
    ["T15", function () { buildBasic("T15", "conda_version", "Conda Testing in Gamma",
        ["submit to conda AE version; verify version in task logs"]); }],
    ["T16", function () { buildBasic("T16", "incompatible_version_warning", "Incompatible Version Warning",
        ["unsupported AE build -> popup on first submit only"]); }],
    ["T17", function () { buildMultiComp("T17", "multicomp", "Multi-Comp Submit",
        ["shift/ctrl-select multiple comps and submit together"]); }],
    ["T18", function () { buildMultiComp("T18", "sticky_settings", "Comp-level Sticky Settings",
        ["set per-comp MFR/frames-per-task; switch comps; verify persistence"]); }],
    ["T19", buildImageSequenceImport],
    ["T20", buildMissingDeps],
    ["T21", function () { buildFonts("T21", "get_user_fonts", "Get User Fonts Python Fallback", false); }]
];

var only = null;
try {
    var onlyEnv = $.getenv("AE_BUILD_ONLY");
    if (onlyEnv) {
        only = {};
        var ids = String(onlyEnv).split(",");
        for (var k = 0; k < ids.length; k++) {
            var id = ids[k].replace(/^\s+|\s+$/g, "").toUpperCase();
            if (id) { only[id] = true; }
        }
        LOG.push("    AE_BUILD_ONLY = " + onlyEnv);
    }
} catch (e) {}

// run_build.py's config wins over the environment, including "" (= build all).
if (BUILD_CFG.hasOwnProperty("only")) {
    only = null;
    if (BUILD_CFG.only) {
        only = {};
        var cfgIds = String(BUILD_CFG.only).split(",");
        for (var ci = 0; ci < cfgIds.length; ci++) {
            if (cfgIds[ci]) { only[cfgIds[ci].toUpperCase()] = true; }
        }
        LOG.push("    only (config) = " + BUILD_CFG.only);
    }
}

// Run on AE's idle loop, not directly at Startup: on a cold launch, building comps
// before AE has a context throws "internal verification failure {no current
// context}" (the same reason the driver JSX defers its work).
function runBuilds() {
for (var b = 0; b < BUILDS.length; b++) {
    var testId = BUILDS[b][0];
    if (only && !only[testId]) { continue; }
    try { BUILDS[b][1](); } catch (err) { LOG.push("FAIL " + testId + ": " + err.toString()); }
}

// Write build log for inspection. A filtered run appends rather than overwrites:
// it rebuilt a subset, so truncating would throw away the record of the projects
// it did not touch.
var logFile = new File(ROOT + "/scripts/build_log_" + AEV + ".txt");
if (only && logFile.exists) {
    logFile.open("e"); logFile.seek(0, 2); logFile.write("\n\n" + LOG.join("\n"));
} else {
    logFile.open("w"); logFile.write(LOG.join("\n"));
}
logFile.close();

// Completion marker, so a headless runner can tell "finished" from "still
// starting up" without watching the log file (see scripts/run_build.py).
var doneFile = new File(Folder.temp.fsName + "/ae_build_projects.done");
doneFile.open("w"); doneFile.write(LOG.join("\n")); doneFile.close();

}

var scheduled = false;
try {
    if (app.scheduleTask) {
        $.global.__aeBuildRun = runBuilds;
        app.scheduleTask("$.global.__aeBuildRun()", 500, false);
        scheduled = true;
    }
} catch (e) {}
if (!scheduled) { runBuilds(); }
