window.onload = function(){

	/************* 初始化棋盘 *****************/
	var board = document.getElementById("board");
	var log = document.getElementById("log");
	var judgeFlag = 1;
	var stepCount = 0;
	var endFlag = false;
	var method = 2; // 1-单机模式 2-联机模式

	var Unit = function(i, j){
		this.dom = document.createElement("div");
		this.dom.className = "unit";
		this.flag = 0; //0为空 1为黑 2为白
		this.liberty = 4;  // 4口气
		if(i==0 || i==18){
			this.liberty --;
		}
		if(j==0 || j==18){
			this.liberty --;
		}
		this.i = i;
		this.j = j;
		var u = this;
		this.dom.addEventListener("click", function(e) {
			if (method == 2) {
				if (network.isAction()) {
					unitOnClick(u, e);
					network.sendAction({
						i: u.i,
						j: u.j
					});
				} else {
					addInfo("还未到你落子或者还没有连接到对手，请等待");
				}
				return;
			}
			unitOnClick(u, e);

		});
		this.judgeFlag = 0;
	};


	/************** 基础动作 ****************/
	Unit.prototype.addToBoard = function(){
		board.appendChild(this.dom);
	};

	Unit.prototype.removeFlag = function(){
		this.flag = 0;
		this.dom.classList.remove("white", "black");
	};

	// undo
	// function UndoStack(self) {
	// 	this.stack = [];
	// 	this.self = self;
	// }
    //
	// UndoStack.prototype.push = function(unit) {
	// 	this.stack.push(unit);
	// };
    //
	// UndoStack.prototype.undo = function () {
	// 	if (this.stack.length > 0) {
	// 		var unit = this.stack.pop();
	// 		unit.removeFlag();
	// 		operateAround(unit, function(temp){  // 四周的棋子+1气
	// 			temp.liberty ++;
	// 		});
	// 		if (this.stack.length > 0) {
	// 			var last = this.stack[this.stack.length-1];
	// 			last.dom.classList.add("active");
	// 		}
	// 		changeRound();
	// 	} else {
	// 		addInfo("无路可退");
	// 		throw new Error("Already at oldest change");
	// 	}
	// };
    //
	// var undostack = new UndoStack();
    //
	Unit.prototype.addWhiteFlag = function(){
		var unit = document.getElementsByClassName("active");
		if (unit.length > 0) {
			unit[0].classList.remove("active");
		}
		this.flag = 2;
		this.dom.classList.add('white', 'active');
		// undostack.push(this);
	};

	Unit.prototype.addBlackFlag = function(){
		var unit = document.getElementsByClassName("active");
		if (unit.length > 0) {
			unit[0].classList.remove("active");
		}
		this.flag = 1;
		this.dom.classList.add('black', 'active');
		// undostack.push(this);
	};

	// Unit.prototype.reset = function(){
	// 	this.flag = 0;
	// 	this.dom.classList.remove("white", "black");
	// 	this.liberty = 4;
	// 	if(i==0 || i==18){
	// 		this.liberty --;
	// 	}
	// 	if(j==0 || j==18){
	// 		this.liberty --;
	// 	}
	// };

	var map = [];


	/*************** 事件动作 *******************/
		// 联机
	var network = (function(){
			var socket = require('socket.io-client')('http://localhost:3000');
			var id = null;
			var isConnect = false;
			var step = 0;
			var action = false;
			socket.on('notice', function(data){
				addInfo("服务器信息：" + data.info);
			});
			socket.on('chat', function(data){
				if (!data.name) {
					data.name = "anonym";
				}
				addInfo(data.name + "：" + data.info);
			});

			return {
				//socket创建
				onCreate: function(callback){
					socket.on('create', function(data){
						id = data.id;
						document.getElementById("playerName").innerHTML = "路人"+data.id;
						callback && callback(data);
					});
				},

				//请求对手
				request: function(name){
					if(id == null){
						return;
					}
					step = 0;
					socket.emit("request", {
						name: name
					});
				},

				//连接上对手
				onConnect: function(callback){
					socket.on('connectPlayer', function(data){
						isConnect = true;
						if(data.color != "black"){
							addInfo("You are black, it's your turn.");
							action = true;
						}else{
							addInfo("Your opponent is black, please wait.");
						}
						callback && callback(data);
					});
				},

				//socket是否已经创建
				isCreate: function(){
					return id;
				},

				//对手是否已经连线,
				isConnect: function(){
					return isConnect;
				},

				//落子
				sendAction: function(data){
					action = false;
					step ++;
					socket.emit("action", data);
				},

				//对手落子
				onAction: function(callback){
					socket.on('action', function(data){
						if(data.id == id){
							//自己的步骤
							return;
						}
						if(step+1 != data.step){
							//服务器出现了数据错误同步
							addInfo("出现数据丢失 sorry");
							return;
						}
						step ++;
						action = true;
						callback && callback(data);
					});
				},

				//是否可以行走
				isAction: function(){
					return action;
				},

				// 聊天
				chat: function(info){
					socket.emit("chat", {
						info: info
					});
				},

				// 重命名
				rename: function(name){
					socket.emit("rename", {
						name: name
					});
				}
			}
		})();

	for(var i=0; i<19; i++){
		var temp = [], t;
		for(var j=0; j<19; j++){
			t = new Unit(i, j);
			t.addToBoard();
			temp.push(t);
		}
		map.push(temp);
	}

	// 落子
	var currentFlag = 1;//当前下子的颜色
	function unitOnClick(unit, e, callback){
		if(endFlag){
			addInfo("游戏已经结束！");
			return;
		}
		e = e || {};
		if(e.ctrlKey){
			return;
		}
		if(unit.flag != 0){
			return;
		}
		if(currentFlag == 1){
			unit.addBlackFlag();
		}else{
			unit.addWhiteFlag();
		}
		changeRound();

		operateAround(unit, function(temp){
			temp.liberty --;
		});

		var lifeFlag = false;
		if(isAlive(unit)){
			lifeFlag = true;
		}

		var clearFlag = false;
		operateAround(unit, function(temp){
			if(temp.flag!=unit.flag && !isAlive(temp)){
				removeAreaByPoint(temp);
				clearFlag = true;
			}
		});

		if(!lifeFlag && clearFlag){
			removeAreaByPoint(unit);
		}

		if(!lifeFlag && !clearFlag){
			addInfo("禁入点");
			unit.removeFlag();
			operateAround(unit, function(temp){
				temp.liberty ++;
			});
			changeRound();
			return;
		}

		stepCount ++;
		if(stepCount > 182*2){
			addInfo("游戏结束！");
			endFlag = true;
		}
	}

	function changeRound(){
		if(currentFlag == 1){
			currentFlag = 2;
			board.classList.add("whiteRound");
			board.classList.remove("blackRound");
		}
		else {
			currentFlag = 1;
			board.classList.remove("whiteRound");
			board.classList.add("blackRound");
		}
	}


	/************** 分析局面 *****************/
	function operateAround(unit, callback){
		var temp;
		temp = getLeftUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getRightUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getUpUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getDownUnit(unit);
		if(temp){
			callback(temp);
		}
	}

	// 判断合法走法
	function isAliveStep(unit){
		if(unit.judgeFlag == judgeFlag){
			return false;
		}
		unit.judgeFlag = judgeFlag;
		if(unit.liberty <= 0){
			var aliveFlag = false;
			operateAround(unit, function(t){
				if(aliveFlag){
					return;
				}
				if(t.flag==unit.flag && isAliveStep(t)){
					aliveFlag = true;
				}
			});
			return aliveFlag;
		}else{
			return true;
		}
	}

	function isAlive(unit){
		if(unit.flag == 0){
			return true;
		}
		judgeFlag ++;
		return isAliveStep(unit);
	}

	// 提子
	function removeAreaByPointStep(unit){
		unit.judgeFlag = judgeFlag;
		operateAround(unit, function(t){
			if(t.judgeFlag != judgeFlag){
				if(t.flag==unit.flag){
					removeAreaByPointStep(t);
				}
			}
		});

		unit.removeFlag();
		operateAround(unit, function(temp){
			temp.liberty ++;
		})

	}

	function removeAreaByPoint(unit){
		if(unit.flag != 0){
			judgeFlag++;
			removeAreaByPointStep(unit);
		}else{
			return true;
		}
		return true;
	}

	// 返回上下左右的棋子状况
	function getUpUnit(unit){
		if(unit.j>0){
			return map[unit.i][unit.j-1];
		}else{
			return null;
		}
	}

	function getDownUnit(unit){
		if(unit.j < 18){
			return map[unit.i][unit.j+1];
		}else{
			return null;
		}
	}

	function getLeftUnit(unit){
		if(unit.i > 0){
			return map[unit.i-1][unit.j];
		}else{
			return null;
		}
	}

	function getRightUnit(unit){
		if(unit.i < 18){
			return map[unit.i+1][unit.j];
		}else{
			return null;
		}
	}


	/************** 功能区 *********************/
		// 重置
	// var reset = document.getElementById("reset");
	// reset.addEventListener("click", function() {
	// 	if (method == 1) {
	// 		judgeFlag = 1;
	// 		stepCount = 0;
	// 		endFlag = false;
	// 		for(var i=0; i<19; i++){
	// 			for(var j=0; j<19; j++){
	// 				map[i][j].reset();
	// 			}
	// 		}
	// 		currentFlag = 1;
	// 		undostack.stack = [];
	// 	}
	// 	else {
	// 		addInfo("当前模式下无法重置");
	// 	}
	//
	// });

	// 撤回
	// var undo = document.getElementById("undo");
	// undo.addEventListener("click", function () {
	// 	if (method == 1) {
	// 		undostack.undo();
	// 	}
	// 	else {
	// 		addInfo("无法悔棋");
	// 	}
	// });

	// 停一手
	// var pass = document.getElementById("pass");
	// pass.addEventListener("click", function () {
	// 	if (method == 1) {
	// 		changeRound();
	// 	}
	// });

	//点击请求对战对手
	var enemy = document.getElementById("requestEnemy");
	enemy.addEventListener("click", function () {
		// if(method != 2){
		// 	addInfo("请选择多人对战模式");
		// 	return ;
		// }
		if(!network.isCreate()){
			addInfo("还未成功连接上服务器，请稍后再试！");
			return ;
		}
		// for(var i=0; i<19; i++){
		// 	for(var j=0; j<19; j++){
		// 		map[i][j].reset();
		// 	}
		// }
		currentFlag = 1;
		addInfo("Request has sent");
		var name = document.getElementById("playerName");
		network.request(name.innerHTML);
	});

	// 修改对战模式
	// var method1 = document.getElementById("method1");
	// method1.addEventListener("click", function () {
	// 	if(network.isConnect()){
	// 		addInfo("您正在多人对战中，该模式选择操作无效");
	// 		return;
	// 	}
	// 	document.getElementById("requestEnemy").style.display = "none";
	// 	document.getElementById("reset").style.display = "block";
	// 	document.getElementById("undo").style.display = "block";
	// 	document.getElementById("pass").style.display = "block";
	// 	method = 1;
	// });
    //
	// var method2 = document.getElementById("method2");
	// method2.addEventListener("click", function () {
	// 	method = 2;
	// 	document.getElementById("requestEnemy").style.display = "block";
	// 	document.getElementById("reset").style.display = "none";
	// 	document.getElementById("undo").style.display = "none";
	// 	document.getElementById("pass").style.display = "none";
	// });

	// 聊天
	var chatBtn = document.getElementById("chatBtn");
	chatBtn.addEventListener("click", function () {
		var info = document.getElementById("chatInput").value;
		if(info){
			network.chat(info);
		}
	});

	// 修改名字
	var playerRename = document.getElementById("playerRename");
	playerRename.addEventListener("click", function () {
		var name = document.getElementById("playerName");
		network.rename(name.value);
		addInfo("You set your nickname: "+name.value);
	});

	//联机对战事件监听
	network.onAction(function(data){
		unitOnClick(map[data.i][data.j]);
	});
	network.onCreate();
	network.onConnect(function(data){
		addInfo("Connect to " + data.name);
	});

	// 发布信息
	function addInfo(text){
		// log.innerHTML += T.encodeHTML(text) + "</br>"
		log.innerHTML += text + "</br>"
	}
};