//仅限挑战服可用

//config below
var maxSignalCfg = 1; //单人boss一天挑战次数
var bannedItem = ["cataclysm:ignitium_elytra_chestplate","minecraft:elytra","create_jetpack:netherite_jetpack","create_jetpack:jetpack"
,"brewery:beer_haley","alexscaves:burrowing_arrow","supplementaries:rope_arrow","farm_and_charm:grandmothers_strawberry_cake"
,"botania:vine_ball","botania:slingshot","supplementaries:slingshot","cataclysm:tidal_claws","botania:rainbow_rod","botania:tornado_rod"]//禁用物品
var blackListEntity = ["man_of_many_planes:scarlet_biplane","man_of_many_planes:economy_plane","minecraft:boat","minecraft:chest_boat",
"immersive_aircraft:airship","immersive_aircraft:cargo_airship","immersive_aircraft:biplane","immersive_aircraft:gyrodyne",
"immersive_aircraft:quadrocopter","immersive_aircraft:bamboo_hopper","immersive_aircraft:warship"]; //实体黑名单
//END

var rightClickCooldown = false;
var ResetFlag = false;
var IIIStageIgnis = new Map();
var PlayerDeadAlready =new Map();
var summonOutTime = new Map();
const BossFightFile = 'kjsReflect\\BossFightFile.json'
var BossFightFileInit = 
{
    "SignalBoss":{
        "playername":0
    },
    "MultiBoss":{
        "playername":0
    }
}

BlockEvents.leftClicked(event => {
    const {block ,player ,level ,server} = event;
    var playername = String(player.username);
    if (block.id == "alexscaves:hazmat_warning_block") {
        var addPlayerToObj = function (playerName ,ObjName ,score) {
            server.runCommandSilent(`/scoreboard players add ${playerName} ${ObjName} ${score}`);
        }

        var preSummon = function (summonX,summonY,summonZ,scoreObjName,entityID) {
            for (var index = 0 ;index <= bannedItem.length - 1 ;index++) {
                player.inventory.clear(bannedItem[index]);
            } //再次试图删除违禁品

            player.removeAllEffects() //解除buff
            player.setInvulnerable(false); //解除无敌
            block.set("air");
            addPlayerToObj(playername ,scoreObjName ,1);  //锁定有一个玩家在战斗中
            var flameCountDown = level.createEntity("cataclysm:flame_strike");
            flameCountDown.mergeNbt(`{WaitTime:100,Duration:0}`);
            flameCountDown.mergeNbt(`{Radius:5,is_soul:1}`);
            flameCountDown.setPos(summonX,summonY,summonZ);//-91.5,-34,3.5
            level.addFreshEntity(flameCountDown);//衰减期每1tick -0.1 Radius
            server.scheduleInTicks(151,() => {
                var singleIgnis = level.createEntity("cataclysm:ignis");
                singleIgnis.persistentData.merge(`{battleType:"Signal",ID:${entityID}}`);
                singleIgnis.setPos(summonX,summonY,summonZ);
                level.addFreshEntity(singleIgnis);
            })
        }

        if (block.pos.equals(BlockPos(-92,-33,3))) {  //初始化战斗实体
            preSummon(-91.5,-34,3.5,"SingalActive",0);
            server.runCommandSilent(`/tp @a[tag=SignalMember,name=!${playername}] -92 -46 -8`);  //剔除无关人员
            server.runCommand(`/tell @a[tag=SignalMember,name=!${playername}] 已经有人在进行挑战了,请等待下一轮`);
            server.runCommandSilent(`/tag @a[tag=SignalMember,name=!${playername}] remove SignalMember`)
            server.runCommandSilent(`/setblock -90 -35 3 minecraft:polished_blackstone`);
        } else if (block.pos.equals(BlockPos(-92,-33,-170))) {
            preSummon(-91.5,-34,-169.5,"SingalActive1",1);
            server.runCommandSilent(`/tp @a[tag=SignalMember1,name=!${playername}] -92 -46 -182`);  //剔除无关人员
            server.runCommand(`/tell @a[tag=SignalMember1,name=!${playername}] 已经有人在进行挑战了,请等待下一轮`);
            server.runCommandSilent(`/tag @a[tag=SignalMember1,name=!${playername}] remove SignalMember1`)
            server.runCommandSilent(`/setblock -90 -35 -170 minecraft:polished_blackstone`);
        }
    }
})

EntityEvents.death(event => {  
    const {entity ,source ,server} = event;
    if (entity.isPlayer()) {  //作战中玩家死亡
        var playername = String(entity.name.string);
        var execAfterPlayerDead = function (ObjName,TagName) {
            var Obj = server.scoreboard.getObjective(ObjName);
            entity.removeTag(TagName);  //清除玩家队伍,之后boss被随即击杀，走下面的genericKill判定
            server.scoreboard.removeObjective(Obj);
            PlayerDeadAlready.delete(String(entity.stringUuid));
            entity.tell(`请再接再厉!`);
            summonOutTime.delete(String(entity.stringUuid));
            return;
        }

        if (server.scoreboard.getObjective("SingalActive") != null && server.scoreboard.hasPlayerScore(playername,server.scoreboard.getObjective("SingalActive"))) {
            execAfterPlayerDead("SingalActive","SignalMember");
        } else if (server.scoreboard.getObjective("SingalActive1") != null && server.scoreboard.hasPlayerScore(playername,server.scoreboard.getObjective("SingalActive1"))) {
            execAfterPlayerDead("SingalActive1","SignalMember1");
        }
        
    }

    if (entity.persistentData.isEmpty()) return; //非玩家的普通生物死亡直接返回

    var resetField = function (ID) {
        switch (ID) {
            case 0:
                server.runCommandSilent(`/tp @e[x=-64,y=-5,z=30,dx=-55,dy=-31,dz=-54,type=minecraft:player] -74 -46 4`);
                server.runCommandSilent(`/setblock -92 -33 3 alexscaves:hazmat_warning_block`);
                server.runCommandSilent(`/setblock -90 -35 3 minecraft:chest{Items:[{Slot:0b,id:"minecraft:wooden_pickaxe",tag:{Damage:0,CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b}]}`);
                break;
            case 1:
                server.runCommandSilent(`/tp @e[x=-119,y=-36,z=-197,dx=55,dy=32,dz=54,type=minecraft:player] -107 -46 -170`);
                server.runCommandSilent(`/setblock -92 -33 -170 alexscaves:hazmat_warning_block`);
                server.runCommandSilent(`/setblock -90 -35 -170 minecraft:chest{Items:[{Slot:0b,id:"minecraft:wooden_pickaxe",tag:{Damage:0,CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b}]}`);
                break;
        }
    }
        
    if (source.getType().match("genericKill")) {  //boss被命令方块击杀重置地形
        switch (entity.persistentData.get("ID").asString) {
            case '0':
                IIIStageIgnis.delete(String(entity.stringUuid));
                resetField(0);
                return;
            case '1':
                IIIStageIgnis.delete(String(entity.stringUuid));
                resetField(1);
                return;
            default:
                return;
        }
    }

    if (source.actual.type != "minecraft:player") return;  //不是玩家所杀返回

    var generateLootChset = function (x,y,z,ticketCount,bevelCount) {
        server.runCommandSilent(`/setblock ${x} ${y} ${z} minecraft:chest{Items:[{Slot:0b,id:"simplehats:haticon",Count:${ticketCount}b},{Slot:1b,id:"numismatics:bevel",Count:${bevelCount}b}]}`);
        server.runCommandSilent(`/execute positioned ${x} ${y} ${z} run lootr custom`);
    }

    if (entity.persistentData.get("battleType").getAsString().match("Signal")) {  //击杀单人tag

        var execAfterWinning = function (x,y,z,ticketCount,bevelCount,ObjName,TagName,ID) {
            var playername = String(source.player.username)
            if (JsonIO.readJson(BossFightFile).isJsonNull()){
                JsonIO.write(BossFightFile,BossFightFileInit);
            }
            var allFightCount = JsonIO.readJson(BossFightFile).getAsJsonObject();  //记录在案
            var signalFightCount = allFightCount.get("SignalBoss").asJsonObject;
            if (signalFightCount.get(playername) != null) {
                var detailSFC = signalFightCount.get(playername).asInt;
                var newSFC = detailSFC + 1;
                signalFightCount.add(playername,newSFC);
                JsonIO.write(BossFightFile,allFightCount);
            } else {
                signalFightCount.add(playername,1);
                JsonIO.write(BossFightFile,allFightCount);
            }
            source.player.setInvulnerable(true);
            generateLootChset(x,y,z,ticketCount,bevelCount);  //生成箱子
            server.runCommandSilent(`/title ${playername} title {"text":"半分后回到大厅,请勿退出服务器","color":"yellow","bold":"true"}`);
            
            server.scheduleInTicks(600,() => {
                var Obj = server.scoreboard.getObjective(ObjName);
                resetField(ID);
                server.scoreboard.removeObjective(Obj);  //释放场地(忙碌)状态
                source.actual.removeTag(TagName);  //释放玩家状态
                PlayerDeadAlready.delete(String(source.actual.stringUuid));
                summonOutTime.delete(String(source.actual.stringUuid));
            })
        }
        
        switch (entity.persistentData.get("ID").asString) {
            case '0':
                execAfterWinning(-92,-33,3,1,1,"SingalActive","SignalMember",0);
                break;
            case '1':
                execAfterWinning(-92,-33,-170,1,1,"SingalActive1","SignalMember1",1);
                break;
        }
    }
})

PlayerEvents.loggedIn(event => {
    const {player ,server} = event;
    server.scheduleInTicks(10,()=>{
        var UUid = String(player.uuid);
        summonOutTime.delete(UUid);
        player.setInvulnerable(true);  //登入后无敌
        var playername = String(player.username);
        var preventJoinField = function (tagName,Obj,tpX,tpY,tpZ) {
            if (player.tags.contains(tagName) && !server.scoreboard.hasPlayerScore(playername,Obj)) {
                player.teleportTo(tpX,tpY,tpZ);
                player.tags.remove(tagName);
                player.tell(`已经有人在进行挑战了,请等待下一轮`);  //杜绝中途加入
            }
        }

        if (player.tags.isEmpty()) return;

        if (player.tags.contains("Exited")) {
            player.teleportTo(-92,-46,-8);
            player.tags.remove("Exited");
            player.tell(`战斗过程中退场,被遣返回大厅`);  //战斗中掉线回到大厅
            return;
        }

        server.scoreboard.objectives.forEach(Obj => { //对照obj检查,阻止中途加入
            switch (String(Obj.name)) {
                case "SingalActive":
                    preventJoinField("SignalMember",Obj,-92,-46,-8);
                    break;
                case "SignalActive1":
                    preventJoinField("SignalMember1",Obj,-107,-46,-170);
                    break;
                default:
                    break;
            }
        })
    })
})


ServerEvents.tick(event => {  
    const {server} = event;
    if (server.tickCount % 1200 == 0) {  //杜绝挂机
        if (ResetFlag) {
            ResetFlag = false;
        }
        var preventHangUp = function (tagName,Obj,tpX,tpY,tpZ) {
            server.players.forEach(player => {
                var UUid = String(player.stringUuid);
                var playername = String(player.username);
                if (player.tags.contains(tagName) && !server.scoreboard.hasPlayerScore(playername,Obj)) {
                    if (!summonOutTime.has(UUid)) {
                        player.tell(`\u00a7e进入场地后请尽快召唤!`);
                        summonOutTime.set(UUid,1);
                    } else if (summonOutTime.has(UUid)) {
                        player.teleportTo(tpX,tpY,tpZ);
                        player.removeTag(tagName);
                        player.tell(`\u00a7c因长时间未召唤被遣返`);
                        summonOutTime.delete(UUid);
                    }
                }
            })
        }

        server.scoreboard.objectives.forEach(Obj => { //挂机传送回准备区
            switch (String(Obj.name)) {
                case "SingalActive":
                    preventHangUp("SignalMember",Obj,-92,-46,-8);
                    break;
                case "SingalActive1":
                    preventHangUp("SignalMember1",Obj,-107,-46,-170);
                    break;
                default:
                    break;
            }
        })
    }
    if (server.tickCount % 300 == 0) {
        if (!ResetFlag) {  //resetFlag防止00:00多次重置
            if (h8 == 0 && min8 == 0) {
                JsonIO.write(BossFightFile,BossFightFileInit);  //重置boss每日记录
                ResetFlag = true;
            }
        }
    } 
    if (server.tickCount % 60 == 0) {
        for (var index = 0 ;index <= blackListEntity.length - 1 ;index++) {
            server.runCommandSilent(`/kill @e[type=${blackListEntity[index]}]`);
        } //定时删除黑名单实体
    }
})

PlayerEvents.loggedOut(event => {
    const {player ,server} = event;
    var playername = String(player.username);

    if (player.tags.isEmpty()) return;

    var tpLeftPlayerOut = function (tagName,Obj,tpX,tpY,tpZ) {
        if (player.tags.contains(tagName) && server.scoreboard.hasPlayerScore(playername,Obj)) {
            player.teleportTo(tpX,tpY,tpZ);
            player.tags.remove(tagName);
            player.addTag("Exited");
            server.scoreboard.removeObjective(Obj);  
            PlayerDeadAlready.delete(String(player.stringUuid));
        }  //战斗中退出传送
    }

    server.scoreboard.objectives.forEach(Obj => { //对照obj检查,退出时即刻传送并移除obj
        switch (String(Obj.name)) {
            case "SingalActive":
                tpLeftPlayerOut("SignalMember",Obj,-92,-46,-8);
                break;
            case "SignalActive1":
                tpLeftPlayerOut("SignalMember1",Obj,-107,-46,-170);
                break;
            default:
                break;
        }
    })
})

BlockEvents.rightClicked("minecraft:oak_button", event => {
    const {hand ,player ,block ,server} = event;
    if (hand != "MAIN_HAND") return;
    var playername = String(player.username);
    if (block.id == "minecraft:oak_button") {
        var hasBannedItem = false;
        player.inventory.allItems.forEach(item => {
            if (bannedItem.indexOf(String(item.id)) != -1) {
                event.player.tell(`${item.id}不应被携带入场,请先把它寄存起来`)
                hasBannedItem = true;
            }
        }) //遍历检测违禁品
        if (hasBannedItem) return;

        var checkAndTpIntoField = function (tpIntoFieldFun) {
            var allFightCount = JsonIO.readJson(BossFightFile).getAsJsonObject();
            var signalFightCount = allFightCount.get("SignalBoss").asJsonObject;
            if (signalFightCount.get(playername) != null) {
                var detailSFC = signalFightCount.get(playername).asInt;
                if (detailSFC >= maxSignalCfg) {
                    player.tell(Component.red(`今日单人挑战次数已用尽`));
                    return;
                } else if (detailSFC < maxSignalCfg) {
                    player.tell(`\u00a7b今日你已挑战\u00a7e${detailSFC}\u00a7b次,还有\u00a7e${maxSignalCfg - detailSFC}\u00a7b次机会`);
                    tpIntoFieldFun();
                }
            } else {
                player.tell(`\u00a7b今日你已挑战\u00a7e0\u00a7b次,还有\u00a7e${maxSignalCfg}\u00a7b次机会`);
                tpIntoFieldFun();
            }
        }

        var TpIntoFieldFuns = function (ID) {
            return function () {
                switch (ID) {
                    case 0:
                        server.runCommandSilent(`/execute if entity @e[x=-64,y=-5,z=30,dx=-55,dy=-31,dz=-54,type=minecraft:player] positioned -92 -46 -26 run title @a[distance=..5] title "已有玩家在挑战"`);
                        server.runCommandSilent(`/execute unless entity @e[x=-64,y=-5,z=30,dx=-55,dy=-31,dz=-54,type=minecraft:player] positioned -92 -46 -26 run tag @p add SignalMember`);
                        server.runCommandSilent(`/execute unless entity @e[x=-64,y=-5,z=30,dx=-55,dy=-31,dz=-54,type=minecraft:player] positioned -92 -46 -26 run tp @p -70.60 -35.00 3.44`);
                        server.runCommandSilent(`/scoreboard objectives add SingalActive dummy "SingalActive"`);
                        break;
                    case 1:
                        server.runCommandSilent(`/execute if entity @e[x=-119,y=-36,z=-197,dx=55,dy=32,dz=54,type=minecraft:player] positioned -92 -46 -199 run title @a[distance=..5] title "已有玩家在挑战"`);
                        server.runCommandSilent(`/execute unless entity @e[x=-119,y=-36,z=-197,dx=55,dy=32,dz=54,type=minecraft:player] positioned -92 -46 -199 run tag @p add SignalMember1`);
                        server.runCommandSilent(`/execute unless entity @e[x=-119,y=-36,z=-197,dx=55,dy=32,dz=54,type=minecraft:player] positioned -92 -46 -199 run tp @p -68 -35 -170`);
                        server.runCommandSilent(`/scoreboard objectives add SingalActive1 dummy "SingalActive1"`);
                        break;
                    default:
                        break;
                }
            }
        }

        if (block.pos.equals(BlockPos(-92,-46,-25))) {
            var TpIntoField = TpIntoFieldFuns(0);
            checkAndTpIntoField(TpIntoField);
        } else if (block.pos.equals(BlockPos(-92,-46,-198))) {
            var TpIntoField = TpIntoFieldFuns(1);
            checkAndTpIntoField(TpIntoField);
        }
    }
})

PlayerEvents.respawned(event => {
    const {player} = event;
    player.setInvulnerable(true); //重生无敌
})

PlayerEvents.tick(event => {
    const {player ,server} = event;
    if (server.tickCount % 15 != 0) return;
    if (player.tags.isEmpty()) return;

    var clearBannedItem = function (tagName,Obj) {
        var playername = String(player.username)
        if (player.tags.contains(tagName) && server.scoreboard.hasPlayerScore(playername,Obj)) {
            for (var index = 0 ;index <= bannedItem.length - 1 ;index++) {
                player.inventory.clear(bannedItem[index]);
            }
        }
    }

    server.scoreboard.objectives.forEach(Obj => { //对照obj检查,如果正在战斗中,持续清除违禁品
        switch (String(Obj.name)) {
            case "SingalActive":
                clearBannedItem("SignalMember",Obj);
                break;
            case "SignalActive1":
                clearBannedItem("SignalMember1",Obj);
                break;
            default:
                break;
        }
    })
})  //场内开局后持续清除违禁品

ServerEvents.entityLootTables(event => {
    event.addEntity("cataclysm:ignis",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    }) 
})  //删除原来的掉落物

EntityEvents.hurt(event => {
    const {entity, server ,damage , player ,source} = event;
    if (source.actual == null) return;
    if (entity.isPlayer()) {
        if (source.actual.persistentData.isEmpty()) return;
        if (source.actual.health < source.actual.maxHealth/3) {  //尽管显示没有补全,但只要来源是生物就可以用
            var currentPlayerHp = player.health;
            var newDamage = damage * 1.4;
            var realDamage = damage * 0.05;
            var playerUUid = String(player.stringUuid);
            if (newDamage + realDamage < currentPlayerHp) {
                player.setHealth(currentPlayerHp - realDamage);
                server.runCommandSilent(`/damage ${playerName} ${newDamage}`);
            }
            if (newDamage + realDamage > currentPlayerHp && !PlayerDeadAlready.has(playerUUid)) {
                player.setHealth(3);
                player.playSound("minecraft:item.totem.use");
                player.runCommandSilent(`/effect give @s minecraft:resistance 3 5 false`);
                PlayerDeadAlready.set(playerUUid,1);
                event.cancel();
            }
            event.cancel();
        } 
    }
    if (!source.actual.isPlayer()) return;
    var entityUUID = String(entity.stringUuid);
    if (entity.health < entity.maxHealth/3 && !IIIStageIgnis.has(entityUUID) && !entity.persistentData.isEmpty()) {
        entity.setInvulnerable(true);
        IIIStageIgnis.set(entityUUID,1);
        server.scheduleInTicks(300,() => {
            entity.setInvulnerable(false);
        })
    }
})

