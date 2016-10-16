const electron = require("electron"),
    app = electron.app,
    BrowserWindow = electron.BrowserWindow;

var control = require('./control');
control.start(app);

// 保持一个对于 window 对象的全局引用，不然，当 JavaScript 被 GC，
// window 会被自动地关闭
var mainWindow = null;

// 当所有窗口被关闭了，退出。
app.on('window-all-closed', function() {
    // 在 OS X 上，通常用户在明确地按下 Cmd + Q 之前
    // 应用会保持活动状态
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    // 创建浏览器窗口。
    mainWindow = new BrowserWindow({fullscreen:true});

    mainWindow.loadURL(`file://${__dirname}/index.html`);
    // mainWindow.openDevTools();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});