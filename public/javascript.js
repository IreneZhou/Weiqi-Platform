window.onload = function(){
	//初始化棋盘
	var board = document.getElementById("board");
	var log = document.getElementById("log");
	var judgeFlag = 1;
	var stepCount = 0;
	var endFlag = false;
	var method = 2; //0-程序员模式 1-小白模式 2-联机模式

	var Unit = function(i, j){
		this.dom = document.createElement("div");
		this.dom.className = "unit";
		this.flag = 0; //0为空 1为黑 2为白
		this.life = 4;
		if(i==0 || i==18){
			this.life --;
		}
		if(j==0 || j==18){
			this.life --;
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

	Unit.prototype.addToBoard = function(){
		board.appendChild(this.dom);
	};

	Unit.prototype.removeFlag = function(){
		this.flag = 0;
		this.dom.classList.remove("white", "black");
	};

	Unit.prototype.addWhiteFlag = function(){
		var unit = document.getElementsByClassName("active");
		if (unit.length > 0) {
			unit[0].classList.remove("active");
		}

		this.flag = 2;
		this.dom.classList.add('white', 'active');
	};

	Unit.prototype.addBlackFlag = function(){
		var unit = document.getElementsByClassName("active");
		if (unit.length > 0) {
			unit[0].classList.remove("active");
		}
		var dom = this.dom;
		this.flag = 1;
		dom.classList.add('black', 'active');
	};

	Unit.prototype.reset = function(){
		this.flag = 0;
		this.dom.classList.remove("white", "black");
		this.life = 4;
		if(i==0 || i==18){
			this.life --;
		}
		if(j==0 || j==18){
			this.life --;
		}
	};

	var map = [];

	//网上联机对战部分
	var network = (function(){
		var HOST = location.host;
		var socket = null;
		var id = null;
		var isConnect = false;
		var step = 0;
		socket = io.connect('http://'+HOST);
		var action = false;
		socket.on('notice', function(data){
			addInfo("服务器信息：" + data.info);
		});
		socket.on('chat', function(data){
			addInfo(data.name + "：" + data.info);
		});

		return {
			//下子
			sendAction: function(data){
				action = false;
				step ++;
				socket.emit("action", data);
			},
			//socket创建
			onCreate: function(callback){
				socket.on('create', function(data){
					id = data.id;
					document.getElementById("playerName").innerHTML = "路人"+data.id;
					callback && callback(data);
				});
			},
			//对手下子
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
			//连接上对手
			onConnect: function(callback){
				socket.on('connectPlayer', function(data){
					isConnect = true;
					if(data.color != "black"){
						addInfo("您是黑棋，请落子");
						action = true;
					}else{
						addInfo("对方黑棋，轮到对方落子");
					}
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
			//是否可以行走
			isAction: function(){
				return action;
			},
			//socket是否已经创建
			isCreate: function(){
                return id;
			},
			//对手是否已经连线,
			isConnect: function(){
				return isConnect;
			},
			chat: function(info){
				socket.emit("chat", {
					info: info
				});
			},
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

	//事件 动作
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
			temp.life --;
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
			//违规下法  不能自杀
			addInfo("禁入点");
			unit.removeFlag();
			operateAround(unit, function(temp){
				temp.life ++;
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

	//棋盘分析方法
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


	function isAliveStep(unit){
		if(unit.judgeFlag == judgeFlag){
			return false;
		}
		unit.judgeFlag = judgeFlag;
		if(unit.life <= 0){
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
			temp.life ++;
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


	//功能区
    var reset = document.getElementById("reset");
    reset.addEventListener("click", function() {
        judgeFlag = 1;
        stepCount = 0;
        endFlag = false;
        for(var i=0; i<19; i++){
            for(var j=0; j<19; j++){
                map[i][j].reset();
            }
        }
        currentFlag = 1;
    });


	//点击请求对战对手
    var enemy = document.getElementById("requestEnemy");
    enemy.addEventListener("click", function () {
        if(method != 2){
            addInfo("请选择多人对战模式");
            return ;
        }
        if(!network.isCreate()){
            addInfo("还未成功连接上服务器，请稍后再试！");
            return ;
        }
        for(var i=0; i<19; i++){
            for(var j=0; j<19; j++){
                map[i][j].reset();
            }
        }
        currentFlag = 1;
        addInfo("请求已经发出，请等待!");
        var name = document.getElementById("playerName");
        network.request(name.innerHTML);
    });

    var method1 = document.getElementById("method1");
    method1.addEventListener("click", function () {
        if(network.isConnect()){
            addInfo("您正在多人对战中，该模式选择操作无效");
            return;
        }
        method = 1;
    });

    var method2 = document.getElementById("method2");
    method2.addEventListener("click", function () {
       method = 2
    });

    var chatBtn = document.getElementById("chatBtn");
    chatBtn.addEventListener("click", function () {
        var info = T.g("chatInput").value;
        if(info){
            network.chat(info);
        }
    });

    var playerRename = document.getElementById("playerRename");
    playerRename.addEventListener("click", function () {
       var name = document.getElementById("playerName");
        network.rename(name.value)
    });


	//联机对战事件监听
	network.onAction(function(data){
		unitOnClick(map[data.i][data.j]);
	});
	network.onCreate();
	network.onConnect(function(data){
		addInfo("已经连接上对手" + data.name);
	});

	function addInfo(text){
		log.innerHTML += T.encodeHTML(text) + "</br>"
	}
};