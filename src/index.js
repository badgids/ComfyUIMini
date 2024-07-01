const express = require("express");
const config = require('../config.json');
const path = require('path');
const axios = require("axios");
const fs = require('fs');

const mainRouter = require('./routes/mainRouter');
const cuiProxyRouter = require('./routes/proxy');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use("/", mainRouter);
app.use("/proxy", cuiProxyRouter);

function checkForWorkflowsFolder() {
    const workflowsFilepath = path.join(__dirname, '..', 'workflows');
    
    if (!fs.existsSync(workflowsFilepath)) {
        fs.mkdirSync(workflowsFilepath);

        console.log(`[INFO] Workflow folder not found, creating...`);
        return;
    }

    try {
        const filesList = fs.readdirSync(workflowsFilepath);
        const jsonFilesList = filesList.filter(file => path.extname(file).toLowerCase() === ".json");

        global.serverWorkflowFilenames = jsonFilesList;

        console.log(`[INFO] Found ${jsonFilesList.length} JSON files in workflow folder.`);
        return;
    } catch (err) {
        console.err('Error reading workflows folder', err);
        return;
    }
}

async function checkForComfyUI() {
    try {
        const responseCodeMeaning = {
            200: "ComfyUI is running."
        };

        const request = await axios.get(config.comfyui_url);
        const status = request.status;

        console.log(`✅ ${status}: ${responseCodeMeaning[status] || "Unknown response."}`);
    } catch (err) {
        const errorCode = err.code;

        const errorMeaning = {
            "ECONNREFUSED": "Make sure ComfyUI is running and is accessible at the URL in the config.json file."
        }

        console.warn(`⚠ ${errorCode}: ${errorMeaning[errorCode] || err}`)
    }
}

function loadSelects() {
    //Load models
    const modelDirsPath = path.join(__dirname, '..', 'model_dirs.json');

    if (!fs.existsSync(modelDirsPath)) {
        fs.copyFileSync(path.join(__dirname, '..', 'model_dirs.example.json'), modelDirsPath);
    }

    const modelDirsJson = JSON.parse(fs.readFileSync(modelDirsPath));

    if (!modelDirsJson.checkpoint || modelDirsJson.checkpoint.folder_path == "path/to/checkpoints/folder") {
        console.warn("⚠ model_dirs.json not configured, MODEL SELECTING WILL NOT WORK work until it is set.")
        return;
    }

    //Get additional selects
    const additionalSelects = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'additional_selects.json')));

    Object.assign(modelDirsJson, additionalSelects);

    global.selects = additionalSelects;
}

checkForComfyUI();
checkForWorkflowsFolder();
loadSelects();

app.listen(config.app_port, '0.0.0.0', () => {
    console.log(`✅ Running on http://localhost:${config.app_port}`);
});