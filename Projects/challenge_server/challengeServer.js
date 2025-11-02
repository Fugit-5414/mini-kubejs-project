//仅限挑战服可用
//注意:
//1.out_of_world 可以触发debuff,genericKill不能
//2.setMaxHealth()设置的是maxHealth的attribute,会因为加血饰品造成紊乱(设置成20时有奥丁则为40HP),但getMaxHealth()可以准确获取最大生命值

//config below
var maxSingleCfg = 1; //单人boss一天挑战次数

var bannedItem = new Set(["cataclysm:ignitium_elytra_chestplate","minecraft:elytra","create_jetpack:netherite_jetpack","create_jetpack:jetpack"
,"brewery:beer_haley","alexscaves:burrowing_arrow","supplementaries:rope_arrow","farm_and_charm:grandmothers_strawberry_cake"
,"botania:vine_ball","botania:slingshot","supplementaries:slingshot","cataclysm:tidal_claws","botania:rainbow_rod","botania:tornado_rod"])//禁用物品

var bannedItemCNReflect = new Map([
    ["cataclysm:ignitium_elytra_chestplate","腾炎鞘翅胸甲"],["minecraft:elytra","鞘翅"],["create_jetpack:netherite_jetpack","下界合金喷气背包"],
    ["create_jetpack:jetpack","喷气背包"],["brewery:beer_haley","海莉啤酒"],["alexscaves:burrowing_arrow","采掘箭"],["supplementaries:rope_arrow","绳索箭矢"],
    ["farm_and_charm:grandmothers_strawberry_cake","奶奶的草莓蛋糕"],["botania:vine_ball","藤蔓球"],["botania:slingshot","活木弹弓"],
    ["supplementaries:slingshot","弹弓"],["cataclysm:tidal_claws","潮汐利爪"],["botania:rainbow_rod","彩虹桥法杖"],["botania:tornado_rod","天空法杖"]
])

var blackListEntity = new Set(["man_of_many_planes:scarlet_biplane","man_of_many_planes:economy_plane","minecraft:boat","minecraft:chest_boat",
"immersive_aircraft:airship","immersive_aircraft:cargo_airship","immersive_aircraft:biplane","immersive_aircraft:gyrodyne",
"immersive_aircraft:quadrocopter","immersive_aircraft:bamboo_hopper","immersive_aircraft:warship"]); //实体黑名单

var bannedEffects = new Set(["minecraft:dolphins_grace","farm_and_charm:grandmas_blessing","farm_and_charm:farmers_blessing","minecraft:levitation"]);

var debuffType = [
    {id:"minecraft:nausea",duration:15 * 20,lvl:2}, //tick
    {id:"minecraft:slowness",duration:3 * 20,lvl:0},
    {id:"minecraft:poison",duration:3 * 20,lvl:2},
    {id:"minecraft:hunger",duration:15 * 20,lvl:7},
    {id:"cataclysm:stun",duration:3 * 20,lvl:0},
    {id:"minecraft:blindness",duration:3 * 20,lvl:0}
];

const DEFAULT_MAX_HEALTH = 20;

const HOLD_ON_TIME_IN_SECONDS = 90; //亡语坚持时间

var clearIllegalBossCooldown = 20 //tick

var rightClickCooldown = 20; //右键点击后的冷却时长(tick)

//临时不可用:{Slot:0b,id:"minecraft:wooden_pickaxe",tag:{Damage:0,display:{Name:'{"text":"训练","color":"green"}'},CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b},
var defaultChargeBoxNBT = `Items:[{Slot:1b,id:"minecraft:iron_pickaxe",tag:{Damage:0,display:{Name:'{"text":"简单","color":"#33CCFF"}'},CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b},{Slot:2b,id:"minecraft:golden_pickaxe",tag:{Damage:0,display:{Name:'{"text":"普通","color":"yellow"}'},CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b},{Slot:3b,id:"minecraft:diamond_pickaxe",tag:{Damage:0,display:{Name:'{"text":"困难","color":"gold"}'},CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b},{Slot:4b,id:"minecraft:netherite_pickaxe",tag:{Damage:0,display:{Name:'{"text":"梦魇(极限)(未做好万全准备请勿进入)","color":"red"}'},CanDestroy:["alexscaves:hazmat_warning_block"]},Count:1b}]`


/**
 * @typedef {Object} configDetails
 * @property {number} fieldOrBossId - 场地与boss的ID
 * @property {string} tagOrFieldObjName - 场地唯一标签与计分板标识名
 * @property {BlockPos} buttonPos - 入场按钮位置
 * @property {BlockPos} lootAndWarnBlockPos - 奖励箱与警戒方块位置
 * @property {Vec3d} tpToPos - 传送入场位置
 * @property {Vec3d} tpBackPos - 传出场地(返回大厅)位置
 * @property {BlockPos} chargeBoxPos - 存放激活boss方块镐子的箱子位置
 * @property {Vec3d} summonPos - 召唤/中途回场位置
 * @property {Internal.AABB} fieldAABB - 场地范围(AABB)
 * @property {String} battleType - 战斗方式(单人/多人?/玩家间切磋?)
 * @property {number} fieldHeight - 场地基准高度(以上层的地板为准)
 */

/**
 * @typedef {Map<number,configDetails>} fieldConfig 
 */

/**@type {fieldConfig} */
const fieldConfig = new Map([  //使用Map集成配置
    [10000,{
        fieldOrBossId : 10000,  
        tagOrFieldObjName : "SingalActive10000",  
        buttonPos : new BlockPos(-92,-46,-25),  
        lootAndWarnBlockPos : new BlockPos(-92,-33,3),  
        tpToPos : new Vec3d(-70.60,-35.00,3.44),
        tpBackPos : new Vec3d(-92,-46,-8),  
        chargeBoxPos : new BlockPos(-90,-35,3),  
        summonPos : new Vec3d(-91.5,-34,3.5),  
        fieldAABB : AABB.of(-64,-2,30,-119,-36,-24),  
        battleType : "Singal",  
        fieldHeight : -36,
        //isBossSummoned : false,    //已写入动态文件
        //difficulty : ""   //已写入动态文件
    }],
    [10001,{
        fieldOrBossId : 10001,
        tagOrFieldObjName : "SingalActive10001",
        buttonPos : new BlockPos(-92,-46,-198),
        lootAndWarnBlockPos : new BlockPos(-92,-33,-170),
        tpToPos : new Vec3d(-68,-35,-170),
        tpBackPos : new Vec3d(-107,-46,-170),
        chargeBoxPos : new BlockPos(-90,-35,-170),
        summonPos : new Vec3d(-91.5,-34,-169.5),
        fieldAABB : AABB.of(-119,-36,-197,-63,-2,-142),
        battleType : "Singal",
        fieldHeight : -36,
    }],
    [10002,{
        fieldOrBossId : 10002,
        tagOrFieldObjName : "SingalActive10002",
        buttonPos : new BlockPos(-93,-46,-361),
        lootAndWarnBlockPos : new BlockPos(-93,-33,-333),
        tpToPos : new Vec3d(-75,-34,-333),
        tpBackPos : new Vec3d(-90,-46,-347),
        chargeBoxPos : new BlockPos(-91,-35,-333),
        summonPos : new Vec3d(-92.5,-34,-332.5),
        fieldAABB : AABB.of(-48,-36,-378,-138,-2,-288),
        battleType : "Singal",
        fieldHeight : -36,
    }],
    [10003,{
        fieldOrBossId : 10003,
        tagOrFieldObjName : "SingalActive10003",
        buttonPos : new BlockPos(-92,-46,-562),
        lootAndWarnBlockPos : new BlockPos(-92,-33,-534),
        tpToPos : new Vec3d(-77,-34,-534),
        tpBackPos : new Vec3d(-89,-46,-547),
        chargeBoxPos : new BlockPos(-90,-35,-534),
        summonPos : new Vec3d(-91.5,-34,-533.5),
        fieldAABB : AABB.of(-47,-36,-579,-137,-2,-489),
        battleType : "Singal",
        fieldHeight : -36,
    }]
])


/**
 * @typedef {Object} globalDifficultyDetails
 * @property {number} bossSpeedMultiplier - boss在四阶段前的移动速度倍率
 * @property {number} enemyDamageMultiplier - boss和小怪的攻击伤害倍率
 * @property {number} fireballCooldown - 召唤火球的间隔时间
 * @property {number} fireballMaxWaveCount - 一次性召唤火球的最多波次
 * @property {number} extraFireballAccelerationScale - 额外火球加速度乘数因子(基准0.1,这里填0.1就是翻倍)
 * @property {number} extraFireballOrMagicDamageScale - 额外火球(或者说魔法(包括烈焰阵))伤害乘数因子
 * @property {number} extraFireballOrExplosionDamageScale - 额外火球(无伤害来源爆炸伤害)伤害乘数因子
 * @property {number} debuffProbability - 被击中后获得debuff的概率
 * @property {number} realDamageMultiplier - 真伤乘数因子(简单模式禁用)
 * @property {number} flameSummonCooldown - 召唤烈焰阵冷却时间
 * @property {number} flameStrikeWaitTime - 烈焰阵提醒时间
 * @property {number} flameStrikeDuration - 烈焰阵生效时间
 * @property {number} flameStrikeDamage - 烈焰阵伤害
 * @property {number} flameStrikeRadius - 烈焰阵半径
 * @property {number} flameStrikeCount - 一次召唤的烈焰阵个数
 * @property {number} finalServantDmgMultiplier - 最终仆从造成的百分比伤害
 * @property {number} canBossDecayHealth - boss能否降低玩家最大生命值
 * @property {number} bossMaxHealthDecayCount - boss造成伤害后的玩家最大生命值衰减
 * @property {number} servantMaxHealthDecayCount - 仆从造成伤害后的玩家最大生命值衰减
 * @property {number} healthDecayCooldown - 最终仆从扣除生命值上限之后不再扣除的一段时间(tick)
 * @property {string} stringLootTable - 战利品nbt文本
 */

/**
 * @typedef {Map<string,globalDifficultyDetails>} difficultyParameter - 难度属性
 */

/**@type {difficultyParameter} */

const difficultyParameter = new Map([
    ["easy",{
        bossSpeedMultiplier : 1,
        enemyDamageMultiplier : 1.5,
        //---
        fireballCooldown : 800, 
        fireballMaxWaveCount : 1,
        extraFireballAccelerationScale : 0,
        extraFireballOrMagicDamageScale : 1,  
        extraFireballOrExplosionDamageScale : 1,
        //---
        debuffProbability : 0,  
        //---
        realDamageMultiplier : 0, 
        //--- 
        flameSummonCooldown : 600,  
        flameStrikeWaitTime : 60,
        flameStrikeDuration : 60,
        flameStrikeDamage : 8,
        flameStrikeRadius : 6.5,
        flameStrikeCount : 1,
        //---
        finalServantDmgMultiplier : 0,  
        //---
        canBossDecayHealth : 0,
        bossMaxHealthDecayCount : 0, 
        servantMaxHealthDecayCount : 0, 
        healthDecayCooldown : 0, 
        //---
        stringLootTable : `LootTable:"challenge:chests/easyreward"`
    }],
    ["normal",{
        bossSpeedMultiplier : 1.1,
        enemyDamageMultiplier : 3,
        //---
        fireballCooldown : 400,  
        fireballMaxWaveCount : 2,
        extraFireballAccelerationScale : 0.05,
        extraFireballOrMagicDamageScale : 1,
        extraFireballOrExplosionDamageScale : 1,
        //---
        debuffProbability : 50,  
        //---
        realDamageMultiplier : 0.05,
        //---
        flameSummonCooldown : 320,
        flameStrikeWaitTime : 45,
        flameStrikeDuration : 80,
        flameStrikeDamage : 14,
        flameStrikeRadius : 6.5,
        flameStrikeCount : 1,
        //---
        finalServantDmgMultiplier : 0.125,
        //---
        canBossDecayHealth : 0,
        bossMaxHealthDecayCount : 0, 
        servantMaxHealthDecayCount : 2,
        healthDecayCooldown : 100, 
        //---
        stringLootTable : `LootTable:"challenge:chests/normalreward"`
    }],
    ["hard",{
        bossSpeedMultiplier : 1.2,
        enemyDamageMultiplier : 4,
        //---
        fireballCooldown : 150,  
        fireballMaxWaveCount : 3, 
        extraFireballAccelerationScale : 0.12,
        extraFireballOrMagicDamageScale : 1,
        extraFireballOrExplosionDamageScale : 1,
        //---
        debuffProbability : 85, 
        //---
        realDamageMultiplier : 0.1,
        //---
        flameSummonCooldown : 160,
        flameStrikeWaitTime : 30,
        flameStrikeDuration : 100,
        flameStrikeDamage : 20,
        flameStrikeRadius : 6.5,
        flameStrikeCount : 2,
        //---
        finalServantDmgMultiplier : 0.25,
        //---
        canBossDecayHealth : 0,
        bossMaxHealthDecayCount : 0, 
        servantMaxHealthDecayCount : 4,
        healthDecayCooldown : 60, 
        //---
        stringLootTable : `LootTable:"challenge:chests/hardreward"`
    }],
    ["hell",{
        bossSpeedMultiplier : 1.5,
        enemyDamageMultiplier : 4,
        //---
        fireballCooldown : 90,  
        fireballMaxWaveCount : 5, //这里应用3-5波随机出
        extraFireballAccelerationScale : 0.15,
        extraFireballOrMagicDamageScale : 5,  //5则为一次掉4-5HP(全套保护五腾炎甲)
        extraFireballOrExplosionDamageScale : 10,  //10则一次掉0-5HP(全套保护五腾炎甲)
        //---
        debuffProbability : 95, 
        //---
        realDamageMultiplier : 0.15,
        //---
        flameSummonCooldown : 140,
        flameStrikeWaitTime : 16,
        flameStrikeDuration : 120,
        flameStrikeDamage : 25,
        flameStrikeRadius : 7,
        flameStrikeCount : 2,
        //---
        finalServantDmgMultiplier : 0.25,
        //---
        canBossDecayHealth : 1,
        bossMaxHealthDecayCount : 2, 
        servantMaxHealthDecayCount : 1,
        healthDecayCooldown : 200, 
        //---
        stringLootTable : `LootTable:"challenge:chests/hardreward"` //暂时拿困难的顶替
    }]
])


/**
 * @typedef {Object} MonsterConfig
 * @property {string} entityType - 实体类型ID
 * @property {number} HP - 生命值
 * @property {number} bulletDamageMultiplier - 子弹伤害乘数因子 
 * @property {number} followPlayerRange - 跟踪玩家范围
 * @property {number} PersistenceRequired - 是否防止自然消失 
 * @property {number} canDecayHealth - 是否会造成生命值衰减
 * @property {number} [isFinalTurn] - 是否为最终回合特殊怪物 
 * @property {number} summonCount - 召唤数量
 */

/**
 * @typedef {Object} DifficultyConfig
 * @property {MonsterConfig} cataclysm_ignited_revenant - 焰魔仆从配置
 * @property {MonsterConfig} [minecraft_piglin_brute] - 猪灵蛮兵配置
 * @property {MonsterConfig} [minecraft_phantom] - 幻翼配置
 * @property {MonsterConfig} [cataclysm_the_harbinger] - 先驱者配置
 */

/**
 * 结构:
 *   Map<"normal" | "hard", DifficultyConfig   >
 * @type {Map<string, DifficultyConfig>}
 */
const ServantMonsterConfig = new Map([  //需要免疫非玩家伤害(魔法和爆炸)
    ["normal",{
        cataclysm_ignited_revenant : {
            entityType : "cataclysm:ignited_revenant",
            HP : 135,
            bulletDamageMultiplier : 0.7,   //对应tacz0.3抗性(0 -> 1 damage下降)(1 - 0.6(乘数因子)),l2damage的抗性是直接用的乘数因子(0.6)
            followPlayerRange : 50,  //跟踪范围
            PersistenceRequired : 1,  //防止自然消失(使用mergeNBT设置)
            canDecayHealth : 0,
            summonCount : 2 //生成2只
        },
        minecraft_piglin_brute : {
            entityType : "minecraft:piglin_brute",
            HP : 50, //待测试
            bulletDamageMultiplier : 0.7, //待测试
            followPlayerRange : 50,
            PersistenceRequired : 1,
            canDecayHealth : 1,  //吃到伤害直接掉八分之一HP
            isFinalTurn : 1,  
            summonCount : 7
        },
        minecraft_phantom : {
            entityType : "minecraft:phantom",
            HP : 20, //待测试
            bulletDamageMultiplier : 0.7, //待测试
            followPlayerRange : 50,
            PersistenceRequired : 1,
            canDecayHealth : 1,
            isFinalTurn : 1,  
            summonCount : 2
        }
    }],
    ["hard",{
        cataclysm_ignited_revenant : {
            entityType : "cataclysm:ignited_revenant",
            HP : 180,
            bulletDamageMultiplier : 0.5,
            followPlayerRange : 50,
            PersistenceRequired : 1,  //防止自然消失(使用mergeNBT设置)
            canDecayHealth : 0,
            summonCount : 3 //生成3只
        },  
        minecraft_piglin_brute : {
            entityType : "minecraft:piglin_brute",
            HP : 50, //待测试
            bulletDamageMultiplier : 0.5, //待测试
            followPlayerRange : 50,
            PersistenceRequired : 1,
            canDecayHealth : 1,  //吃到伤害直接掉四分之一HP
            isFinalTurn : 1,  
            summonCount : 7
        },
        minecraft_phantom : {
            entityType : "minecraft:phantom",
            HP : 20, //待测试
            bulletDamageMultiplier : 0.4, //待测试
            followPlayerRange : 50,
            PersistenceRequired : 1,
            canDecayHealth : 1,
            isFinalTurn : 1,  
            summonCount : 2
        }
    }],
    ["hell",{
        cataclysm_ignited_revenant : {
            entityType : "cataclysm:ignited_revenant",
            HP : 200,
            bulletDamageMultiplier : 0.35,
            followPlayerRange : 50,
            PersistenceRequired : 1,  //防止自然消失(使用mergeNBT设置)
            canDecayHealth : 1,
            summonCount : 4 //生成3只
        },
        cataclysm_the_harbinger : {
            entityType : "cataclysm:the_harbinger",
            HP : 350, //待测试
            bulletDamageMultiplier : 0.5, //待测试
            followPlayerRange : 50,
            PersistenceRequired : 1,
            canDecayHealth : 1,  //吃到伤害直接掉四分之一HP
            isFinalTurn : 1,  
            summonCount : 1
        }
    }]
])
//END


/** 
 * @typedef {Object} effectionDetails
 * @property {string} [ObjName] - 计分板Obj的操作名称
 * @property {string} [ObjDisplayName] - 计分板Obj的展示名称
 * @property {string} effectionfakeEnPlayerName - 效果的英文名
 * @property {string} effectionfakeCnPlayerName - 效果的中文名
 * @property {number} maxLevel - 最大层数
 * @property {number} decayTime - 衰减时间(tick)
 **/

/**@typedef {Map<string,effectionDetails>} customEffections*/

/**@type {customEffections}*/
const customEffections = new Map([
    ["basicConfig",{
        ObjName : "Customeffection",
        ObjDisplayName : "自定义效果",
        effectionfakeEnPlayerName : "basicConfig",
        effectionfakeCnPlayerName : "基本设置",
        maxLevel : 0,
        decayTime : 0
    }],
    ["deepWound",{
        effectionfakeEnPlayerName : "deepWound",
        effectionfakeCnPlayerName : "深层创伤",
        maxLevel : 10,
        decayTime : 200
    }]
])

var airBlocks = new Set(["minecraft:void_air","minecraft:air"]);  //空气方块(标识出虚空空气)

const ExceptionIPFile = 'kjsReflect\\challenge_server\\detectedExceptionIP.json'
const PlayerIPFile = 'kjsReflect\\challenge_server\\IPconfig.json'
const BossFightFile = 'kjsReflect\\challenge_server\\BossFightFile.json'
const FieldStatusFile = 'kjsReflect\\challenge_server\\FieldStatus.json'

var excIPInit = {} 
//working status =>
    /*
    {
        "playerName":[...]
    }
    */
var IpRecordInit = 
{
    "player_name_regex": ".\\w+|\\w+",
    "users": {},
    "banned_player": [],
    "banned_ips": []
}
var BossFightFileInit = 
{
    "SingleBoss":{
        "playername":0
    },
    "MultiBoss":{
        "playername":0
    }
}
var FieldStatusInit = 
{
	"lastUpdateDay" : 0,
	"SingleBoss": {
		"playername": 0
	},
	"MultiBoss": {
		"playername": 0
	}
}













//method below =======================================
const {random} = Utils;
const MobEffectInstance = Java.loadClass(`net.minecraft.world.effect.MobEffectInstance`)
const DustParticleOptions = Java.loadClass(`net.minecraft.core.particles.DustParticleOptions`);
const LivingEntity = Java.loadClass(`net.minecraft.world.entity.LivingEntity`);

/**@typedef {string} playerName */
/**@typedef {string} playerOrEntityUuid */
/**@type {Map<playerName,number>} - 记录玩家最大hp相对于正常最大hp(20)多出的部分 */
var playerExtraMaxHpMap = new Map();  
/**@type {Map<playerOrEntityUuid,number>} - 二阶段焰魔名单 */ 
var IIStageIgnis = new Map();  
/**@type {Map<playerOrEntityUuid,number>} - 三阶段焰魔名单 */ 
var IIIStageIgnis = new Map();  
/**@type {Map<playerOrEntityUuid,number>} - 触发过自保功能的玩家名单 */ 
var PlayerHasDied = new Map();  
/**@type {Map<playerOrEntityUuid,number>} - 挂机时长过久被记录的玩家名单 */ 
var summonOutTime = new Map();  
/**@type {Map<playerOrEntityUuid,number>} - 对于每个boss的命中次数(用于缓冲执行某些hurt事件) */ 
var hitCount = new Map();  
/**@type {Map<playerName,number>} - 被施加debuff后的冷却锁 */ 
var debuffLock = new Map();  
/**@type {Map<playerName,number>} - 被施加深层创伤后的冷却锁 */ 
var deepWoundLock = new Map()  
/**@type {Map<playerName,number>} - 最大生命值被削减后冷却锁 */ 
var maxHealthDecay = new Map(); 
/**@type {Map<playerOrEntityUuid,number>} - 每个boss最大恢复的HP值(换阶段HP恢复上限变化) */ 
var maxRegenationHp = new Map(); 
/**@type {Map<playerOrEntityUuid,number>} - 进入最终战的boss名单 */ 
var isBossFinalTurn = new Map(); 
/**@type {Map<playerName,number>} - 尝试返回场地的玩家集*/ 
var backingFieldPlayerList = new Set(); 
/**@type {Map<playerOrEntityUuid,number>} - 玩家使用返回场地命令时boss的hp */ 
var bossHpWhenPlayerUseCmd = new Map(); 
/** 
 * @typedef FieldStatus
 * @property {boolean} isBossSummoned
 * @property {string} difficulty
*/
/**@type {Map<string,FieldStatus>} - ID为键的场地状态缓存(用于处理server遍历事件) */
var FieldStatusCache = new Map(); 
var playerToFieldReflection = new Map(); //玩家为键的场地状态缓存(用于处理hurt事件等)
var dateCache = -1;

/**@type {Map<id ,leftTime>} */
var activeBossbarTimer = new Map();

const single_Ignis = {  //使用Object封装方法与某些特定属性(类似于Java的工具类(Class))  public class XXX
    /**管理难度获取相关的方法 */
    difficultyManager : {  //类似java封装静态类 public static class XXX  
    //-------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player 
         * @param {configDetails} config
         * @returns {string | void}
         */
        difficultyChoose : function (player ,config) {
            switch (String(player.mainHandItem.id)){
                /*case "minecraft:wooden_pickaxe" :
                    break;*/
                case "minecraft:iron_pickaxe" :
                    single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","easy");
                    return "easy";
                case "minecraft:golden_pickaxe" :
                    single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","normal");
                    return "normal";
                case "minecraft:diamond_pickaxe" :
                    single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","hard");
                    return "hard";
                case "minecraft:netherite_pickaxe" :
                    single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","hell");
                    return "hell";
                default :
                    player.tell("请使用正确的物品召唤!")
                    return null;
            }
        },
    },
    /**管理获取设置的方法 */
    getConfigManager : {  
        /**
         * @param {BlockPos} blockPos
         * @returns {configDetails|null}
         */
        getConfigByButtonPos : function (blockPos) {  //根据按钮位置获取配置项
            /**
             * @param {number} id
             */
            //Map<Key,Value> 的遍历方式:
            //  1.使用for (const [id, config] of fieldConfig)可以同时获取键和值
            //  2.使用for (const config of fieldConfig.values())可以只获取值
            //  3.(不推荐) 直接for (const config of fieldConfig) => 得到键值对数组

            //不要混用 for (... in ...) 和 for (... of ...)!
            //前者用于遍历普通对象的键名称(string),后者用于遍历可迭代对象(如Map,Set,Array)的值(Any)
            for (const [id, config] of fieldConfig) { //{[[id1,{...}],[id2,{...}]]}
                if (config.buttonPos.equals(blockPos)) {
                    return config;
                }
            }
            return null;
        },
    //-------------------------------------------------------------------------------------    
        /**
         * @param {BlockPos} blockPos
         * @returns {configDetails|null}
         */
        getConfigByWarnBlockPos : function (blockPos) {  //根据警戒方块位置获取配置项
            /**
             * @param {number} id
             */
            for (const [id, config] of fieldConfig) { //{[[id1,{...}],[id2,{...}]]}
                if (config.lootAndWarnBlockPos.equals(blockPos)) {
                    return config;
                }
            }
            return null;
        },
    //-------------------------------------------------------------------------------------    
        /**
         * @param {string} tagOrObjName
         * @returns {configDetails|null}
         */
        getConfigByObjName : function (tagOrObjName) {  //根据ObjName获取配置项(或许有时候玩家tag已知时也可以用)
            for (const [id, config] of fieldConfig) { 
                if (config.tagOrFieldObjName == tagOrObjName) {
                    return config;
                }
            }
            return null;
        },
    //-------------------------------------------------------------------------------------  
        /**
         * @param {number|Internal.LivingEntity} Any
         * @returns {configDetails|null}
         */
        getConfigByID : function (Any) {  //根据bossID或直接ID获取配置项
            if (typeof Any == "number") {
                return fieldConfig.get(Any)
            } else if (Any instanceof LivingEntity) {
                if (Any.persistentData.getInt("ID") == 0) return null;
                return fieldConfig.get(Any.persistentData.getInt("ID"))
            }
            return null;
        },
    //-------------------------------------------------------------------------------------    
        /**
         * @param {Internal.Player} player
         * @returns {configDetails|null}
         */
        getConfigByPlayerTags : function (player) {  //根据player的tag获取配置项
            for (const [id, config] of fieldConfig) { 
                if (player.tags.contains(config.tagOrFieldObjName)) {
                    return config;
                }
            }
            return null;
        }
    },
    /**管理场地以及失败,胜利等的方法 */
    FieldManager : {   
        /**
         * @param {Internal.MinecraftServer} server
         * @param {number} score
         * @param {String} playerName 
         * @param {String} ObjName 
         * @returns {void}
         */
        addPlayerToObj : function (server ,playerName ,ObjName ,score) {
            server.runCommandSilent(`/scoreboard players add ${playerName} ${ObjName} ${score}`);
        },
    //------------------------------------------------------------------------------------- 
        /**
         * @param {Internal.Player} player 
         * @returns {boolean} 
         */
        scanBannedItem : function (player) {
            var hasBannedItem = false
            //(迭代器创建快照,避免并发修改)
            //迭代器,类似指针,从第0位之前的位置开始
            var iterator = player.inventory.allItems.iterator();
            //如果后续有元素
            while (iterator.hasNext()) {
                //移动指向处(指向下一个元素)并获取指向的元素
                var item = iterator.next();
                if (bannedItem.has(String(item.id))) {
                    var chineseTranslation = bannedItemCNReflect.get(String(item.id));
                    if (chineseTranslation == null) {
                        chineseTranslation = item.id;
                        console.warn(`${item.id}不存在已被定义的中文译名`);
                    }
                    player.tell(`${chineseTranslation}不应被携带入场,请先把它寄存起来`)
                    hasBannedItem = true;
                }
            }
            return hasBannedItem;
        },
    //-------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {string} StringNBT 
         * @param {BlockPos} buttonBlockPos
         * @param {Internal.Level} level 
         * @returns {void} 
         */
        resetFieldByButton : function (server ,StringNBT ,buttonBlockPos ,level) {
            var config = single_Ignis.getConfigManager.getConfigByButtonPos(buttonBlockPos);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }

            var fieldAABB = config.fieldAABB;
            var xAABBMax = fieldAABB.maxX;
            var zAABBMax = fieldAABB.maxZ;
            var xAABBMin = fieldAABB.minX;
            var zAABBMin = fieldAABB.minZ;
            var isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
            server.runCommandSilent(`/forceload add ${xAABBMax} ${zAABBMax} ${xAABBMin} ${zAABBMin}`);
            if (isBossSummoned) {
                console.warn(`试图在boss已召唤的情况下进入场地,或数据出现问题`);
                server.tell(Component.red(`试图在boss已召唤的情况下进入场地,或数据出现问题,如场地内不存在boss,请联系管理员`))
                return;
            }
            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type != "minecraft:item" && entity.type != "minecraft:player").forEach(entity => {
                if (entity.type == "cataclysm:ignis") {
                    this.execAfterBossDied(server ,entity ,level);
                }
                entity.discard();
            })
            server.runCommandSilent(`/fill ${config.fieldAABB.minX} ${config.fieldHeight} ${config.fieldAABB.minZ} ${config.fieldAABB.maxX} ${config.fieldHeight + 5} ${config.fieldAABB.maxZ} air replace water`);
            server.runCommandSilent(`/fill ${config.fieldAABB.minX} ${config.fieldHeight} ${config.fieldAABB.minZ} ${config.fieldAABB.maxX} ${config.fieldHeight + 5} ${config.fieldAABB.maxZ} air replace ice`);
            server.runCommandSilent(`/setblock ${config.lootAndWarnBlockPos.x} ${config.lootAndWarnBlockPos.y} ${config.lootAndWarnBlockPos.z} alexscaves:hazmat_warning_block`);
            server.runCommandSilent(`/setblock ${config.chargeBoxPos.x} ${config.chargeBoxPos.y} ${config.chargeBoxPos.z} air`);
            server.scheduleInTicks(1,() => {
                server.runCommandSilent(`/setblock ${config.chargeBoxPos.x} ${config.chargeBoxPos.y} ${config.chargeBoxPos.z} minecraft:chest{${StringNBT}}`);
                server.runCommandSilent(`/forceload remove ${xAABBMax} ${zAABBMax} ${xAABBMin} ${zAABBMin}`);
            })
        },
    //-------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {BlockPos} buttonBlockPos 
         * @param {Internal.Level} level 
         * @param {Internal.Player} player
         * @returns {boolean} - 是否传送(返回否时终止主函数下的逻辑)
         */
        TpIntoField : function (server ,buttonBlockPos ,level ,player) {
            var config = single_Ignis.getConfigManager.getConfigByButtonPos(buttonBlockPos);
            if (config == null) {
                console.error(`配置项为空!`);
                return false;
            }
            /**@type {Map<playerName,[association_playerName]>} */
            var ExceptionIPs = JsonIO.read(ExceptionIPFile);
            if (!level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").isEmpty()) {
                server.runCommandSilent(`/execute positioned ${buttonBlockPos.x} ${buttonBlockPos.y} ${buttonBlockPos.z} run title @a[distance=..5] title "已有玩家在挑战"`);
                return false;
            } else {
                var nearestPlayer = player;
                //var nearestPlayer = level.getNearestPlayer(buttonBlockPos.x,buttonBlockPos.y,buttonBlockPos.z,5,false);  //最后一个boolean表示是否只获取生存玩家
                
                nearestPlayer.tags.forEach(tag => {
                    if (tag.startsWith("SingalActive")) {
                        nearestPlayer.tags.remove(tag);
                    }
                })
                if (playerToFieldReflection.has(String(nearestPlayer.username))) {
                    playerToFieldReflection.delete(String(nearestPlayer.username));
                }
                nearestPlayer.tags.add(config.tagOrFieldObjName)  //获取到的player执行命令时遵循命令上下文中其拥有的权限级别,故不能用runCommand
                nearestPlayer.teleportTo(config.tpToPos.x(),config.tpToPos.y(),config.tpToPos.z());
                if (ExceptionIPs != null && ExceptionIPs.get(String(nearestPlayer.username)) != null) {
                    nearestPlayer.tell(Component.gold(`请勿一人操控多个账号重复挑战,这可能会影响奖励发放`));
                }
                server.runCommandSilent(`/scoreboard objectives add ${config.tagOrFieldObjName} dummy "${config.tagOrFieldObjName}"`);
                return true;
            }
        },
    //-------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.BlockContainerJS} block
         * @param {Internal.Player} player
         * @param {BlockPos} warnBlockPos
         * @param {Internal.Level} level
         * @returns {void}
         */
        preSummon : function (server ,level ,player ,block ,warnBlockPos) {   //等效于 private static void preSummon (a,b,c,d) {...}
            var config = single_Ignis.getConfigManager.getConfigByWarnBlockPos(warnBlockPos);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            var difficulty = single_Ignis.difficultyManager.difficultyChoose(player,config);
            if (difficulty == null) {
                console.error("难度不存在");
                return;
            }
            single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"isBossSummoned",true);
            var playername = String(player.username);
            bannedItem.forEach(item => {
                player.inventory.clear(item);
            }) //再次试图删除违禁品

            player.removeAllEffects() //解除buff
            player.setInvulnerable(false); //解除无敌
            player.tags.add(config.tagOrFieldObjName);
            player.setMainHandItem("air");
            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            if (Obj == null) {
                server.runCommandSilent(`/scoreboard objectives add ${config.tagOrFieldObjName} dummy "${config.tagOrFieldObjName}"`);
            }

            this.addPlayerToObj(server ,playername ,config.tagOrFieldObjName ,1);  //锁定有一个玩家在战斗中
            playerToFieldReflection.set(playername,config.fieldOrBossId.toString());

            if (player.maxHealth > DEFAULT_MAX_HEALTH) {
                var extraMaxHealth = player.maxHealth - DEFAULT_MAX_HEALTH;
                playerExtraMaxHpMap.set(playername,extraMaxHealth);
            }
            single_Ignis.CustomEffectionManager.customEffectionsInit(server,config.fieldOrBossId);

            var flameCountDown = level.createEntity("cataclysm:flame_strike");
            flameCountDown.mergeNbt(`{WaitTime:100,Duration:0}`);
            flameCountDown.mergeNbt(`{Radius:5,is_soul:1}`);
            flameCountDown.setPos(config.summonPos);//-91.5,-34,3.5
            level.addFreshEntity(flameCountDown);//衰减期每1tick -0.1 Radius

            block.set("air");

            var canBossDecayHp = difficultyParameter.get(difficulty).canBossDecayHealth;
            server.scheduleInTicks(151,() => {
                /** @type {Internal.LivingEntity} */
                var singleIgnis = level.createEntity("cataclysm:ignis");
                var entityUUID = String(singleIgnis.stringUuid);
                if (difficulty == "easy") {
                    singleIgnis.setMaxHealth(750);
                    singleIgnis.setHealth(750);
                } else {
                    singleIgnis.setMaxHealth(1024);
                    singleIgnis.setHealth(1024);
                }
                singleIgnis.setAttributeBaseValue("minecraft:generic.movement_speed",difficultyParameter.get(difficulty).bossSpeedMultiplier * 0.3);
                singleIgnis.persistentData.merge(`{isBoss:1,battleType:"${config.battleType}",ID:${config.fieldOrBossId},difficulty:${difficulty}}`);
                if (canBossDecayHp == 1) {
                    singleIgnis.persistentData.merge(`{canDecayHealth:1}`);
                }
                singleIgnis.setPos(config.summonPos);
                maxRegenationHp.set(entityUUID,singleIgnis.maxHealth);
                level.addFreshEntity(singleIgnis);
            })
        },
    //---------------------------------------------------------------------------------------
        /** 
         * @param {BlockPos} warnBlockpos
         * @param {Internal.Player} mainPlayer
         * @param {Internal.Level} level
         * @param {Internal.MinecraftServer} server
         * @returns {void}
        */
        ExecWhileSummoning : function (mainPlayer ,warnBlockpos ,level ,server) {
            var config = single_Ignis.getConfigManager.getConfigByWarnBlockPos(warnBlockpos);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }

            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").forEach(player => {
                if (player.tags.contains(config.tagOrFieldObjName) && String(player.username) != String(mainPlayer.username)) {
                    player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                    player.tell("已经有人在进行挑战了,请等待下一轮");
                    player.tags.remove(config.tagOrFieldObjName);
                }
            })
            server.runCommandSilent(`/setblock ${config.chargeBoxPos.x} ${config.chargeBoxPos.y} ${config.chargeBoxPos.z} minecraft:polished_blackstone`);
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level
         * @returns {void}
         */
        execAfterPlayerDead : function (entity ,server ,level) {
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(entity);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            entity.tell(`请再接再厉!`);
            this.tryDiscardBossByPlayer(server,entity,level);
            this.resetFieldByID(server,level,config);
            single_Ignis.GlobalManager.clearAllUselessParams(server,config,entity);
            return;
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level 
         * @param {configDetails} config
         * @returns {void}
         */
        resetFieldByID : function (server ,level ,config) {
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }

            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").forEach(player => {
                player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());            
            })
            server.runCommandSilent(`/setblock ${config.lootAndWarnBlockPos.x} ${config.lootAndWarnBlockPos.y} ${config.lootAndWarnBlockPos.z} alexscaves:hazmat_warning_block`);
            server.runCommandSilent(`/setblock ${config.chargeBoxPos.x} ${config.chargeBoxPos.y} ${config.chargeBoxPos.z} minecraft:chest{${defaultChargeBoxNBT}}`);
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level
         * @param {AABB} fieldAABB 
         * @returns {boolean}
         */ 
        shouldGenerateLoot : function (server ,level ,fieldAABB) {
            /**@type {Internal.Player} */
            var battlePlayer = null;
            var playerInField = level.getEntitiesWithin(fieldAABB).filter(entity => entity.type == "minecraft:player");
            if (playerInField.isEmpty()) {
                console.error(`未找到玩家`);
                return false;
            }

            for (const player of playerInField) {
                var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
                if (config == null) {
                    console.debug(`已遍历玩家${player.username},未找到配置`);
                    continue;
                }
                var playername = String(player.username); 
                var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
                if (server.scoreboard.hasPlayerScore(playername,Obj)) {
                    battlePlayer = player;
                    break;
                }
                console.debug(`已遍历玩家${player.username},未在标识队伍中`)
            }
            
            if (battlePlayer == null) {
                console.error(`未找到指定玩家`); 
                return false;
            }

            var playername = String(battlePlayer.username);
            //SFC -> SingleFightCount
            var bool = single_Ignis.GlobalManager.tellPlayerChallengeCount(battlePlayer,true);
            return bool;
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {number} x 
         * @param {number} y 
         * @param {number} z 
         * @param {string} stringLootTable 
         * @returns {void}
         */
        generateLootChset : function (server,x,y,z,stringLootTable) {
            server.runCommandSilent(`/setblock ${x} ${y} ${z} minecraft:chest{${stringLootTable}}`);
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.LivingEntity} entity
         * @param {Internal.Level} level 
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        execAfterWinning : function (entity ,level ,server) {
            var config = single_Ignis.getConfigManager.getConfigByID(entity);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            var playername = "";

            if (JsonIO.readJson(BossFightFile).isJsonNull()){
                JsonIO.write(BossFightFile,BossFightFileInit);
            }
            var allFightCount = JsonIO.readJson(BossFightFile).getAsJsonObject();  //记录在案
            var SingleFightCount = allFightCount.get("SingleBoss").asJsonObject;
            
            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").forEach(player => {
                if (server.scoreboard.hasPlayerScore(String(player.username),Obj)) {
                    playername = String(player.username);
                }
                player.setInvulnerable(true);
                player.setMaxHealth(20);
                server.scheduleInTicks(600,() => {
                    single_Ignis.GlobalManager.clearAllUselessParams(server,config,player);
                })
            })

            var difficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);

            if (this.shouldGenerateLoot(server ,level ,config.fieldAABB)) {
                this.generateLootChset(server,config.lootAndWarnBlockPos.x,config.lootAndWarnBlockPos.y,config.lootAndWarnBlockPos.z,difficultyParameter.get(difficulty).stringLootTable);  //生成箱子
                server.scheduleInTicks(2,() => {
                    if (level.getBlock(config.lootAndWarnBlockPos.x,config.lootAndWarnBlockPos.y,config.lootAndWarnBlockPos.z).id == "minecraft:air") {
                        console.error(`奖励箱生成异常!`);
                    }
                })
            }

            if (SingleFightCount.get(playername) != null) {
                var detailSFC = SingleFightCount.get(playername).asInt;
                var newSFC = detailSFC + 1;
                SingleFightCount.add(playername,newSFC);
                JsonIO.write(BossFightFile,allFightCount);
            } else {
                SingleFightCount.add(playername,1);
                JsonIO.write(BossFightFile,allFightCount);
            }
            
            IIIStageIgnis.delete(String(entity.stringUuid));

            server.runCommandSilent(`/title ${playername} title {"text":"半分后回到大厅,请勿退出服务器","color":"yellow","bold":"true"}`);
            
            server.scheduleInTicks(600,() => {
                this.resetFieldByID(server,level,config);
            })
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.LivingEntity} entity
         * @param {Internal.Level} level
         * @returns {void}
         */
        execAfterBossDied : function (server ,entity ,level) {
            var config = single_Ignis.getConfigManager.getConfigByID(entity);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"isBossSummoned",false);
            single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","");
            
            activeBossbarTimer.delete(config.fieldOrBossId);
            server.runCommandSilent(`/bossbar remove minecraft:${config.fieldOrBossId}`);
            var entityUUID = String(entity.stringUuid);
            IIIStageIgnis.delete(entityUUID);
            hitCount.delete(entityUUID);  
            maxRegenationHp.delete(entityUUID);
            activeBossbarTimer.delete(config.fieldOrBossId);

            level.getEntitiesWithin(config.fieldAABB).filter(entities => entities.type != "minecraft:player" && entities.type != "minecraft:item").forEach(entity => {
                entity.discard();
            })
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Player} player
         * @param {Internal.Level} level
         * @returns {void}
         */
        tryDiscardBossByPlayer : function (server ,player ,level) {
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                return;
            }
            if (level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").isEmpty()) {
                level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type != "minecraft:item" && entity.type != "minecraft:player").forEach(entity => {
                    if (entity.type == "cataclysm:ignis") {
                        this.execAfterBossDied(server, entity ,level);
                    }
                    entity.discard();
                })
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Level} level
         * @returns {void}
         */
        tryDiscardBossByGlobal : function (server ,level) {
            for (const [id, config] of fieldConfig) { //{[[id1,{...}],[id2,{...}]]},
                var isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
                if (!isBossSummoned) continue;
                var fieldAABB = config.fieldAABB;
                var xAABBMax = fieldAABB.maxX;
                var zAABBMax = fieldAABB.maxZ;
                var xAABBMin = fieldAABB.minX;
                var zAABBMin = fieldAABB.minZ;
                var isBossReallyExist = false;
                server.runCommandSilent(`/forceload add ${xAABBMax} ${zAABBMax} ${xAABBMin} ${zAABBMin}`);
                server.runCommandSilent(`/fill ${config.fieldAABB.minX} ${config.fieldHeight} ${config.fieldAABB.minZ} ${config.fieldAABB.maxX} ${config.fieldHeight + 5} ${config.fieldAABB.maxZ} air replace water`);
                server.runCommandSilent(`/fill ${config.fieldAABB.minX} ${config.fieldHeight} ${config.fieldAABB.minZ} ${config.fieldAABB.maxX} ${config.fieldHeight + 5} ${config.fieldAABB.maxZ} air replace ice`);
                var entitiesInField = level.getEntitiesWithin(config.fieldAABB);
                if (entitiesInField.filter(entity => entity.type == "minecraft:player").isEmpty()) {
                    entitiesInField.filter(entity => entity.type != "minecraft:item" && entity.type != "minecraft:player").forEach(entity => {
                        if (entity.type == "cataclysm:ignis") {
                            this.execAfterBossDied(server ,entity ,level);
                            isBossReallyExist = true;
                        }
                        entity.discard();
                    })
                    if (!isBossReallyExist) {
                        single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","");
                        single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"isBossSummoned",false);
                    }
                    console.log(`已清除无人场地的boss,场地id为${config.fieldOrBossId}`);
                }
                server.runCommandSilent(`/forceload remove ${xAABBMax} ${zAABBMax} ${xAABBMin} ${zAABBMin}`);
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.CommandSourceStack} source
         * @returns {void}
         */
        tryTpBattlePlayerBackToField : function (source) {
            const {server ,player ,level} = source;
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                player.tell(Component.red(`您当前不在任何一场战斗中!`));
                return;
            } else {
                var playername = String(player.username);
                var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
                if (Obj == null) {
                    player.tell(Component.red(`计分板出现异常`));
                    console.error(`不存在的计分板名称${config.tagOrFieldObjName}`);
                    return;
                }
                var entitiesInField = level.getEntitiesWithin(config.fieldAABB);
                var bossList = entitiesInField.filter(entity => entity.type == "cataclysm:ignis");
                /**@type {Internal.LivingEntity} */
                var boss = bossList.getFirst();
                if (boss == null) {
                    player.tell(`boss已不存在,即将返回大厅...`);
                    console.warn(`不存在boss`);
                    player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                    single_Ignis.GlobalManager.clearAllUselessParams(server,config,player);
                    return;
                }
                var bossUUID = String(boss.stringUuid);
                bossHpWhenPlayerUseCmd.set(bossUUID,boss.health);
                
                var isPlayerInBattle = server.scoreboard.hasPlayerScore(playername,Obj);
                if (isPlayerInBattle) {
                    if (!backingFieldPlayerList.has(playername)) {
                        player.tell(Component.green(`五秒后即将回到场地`));
                        backingFieldPlayerList.add(playername);
                        server.scheduleInTicks(100 ,() => {
                            backingFieldPlayerList.delete(playername);
                            var correctHp = bossHpWhenPlayerUseCmd.get(bossUUID);
                            var currentBoss = level.getEntity(boss.uuid);
                            if (currentBoss.isRemoved() || currentBoss == null) {
                                player.tell(`boss状态异常,已返回大厅`);
                                console.warn(`不存在boss,可能被异常移除`);
                                single_Ignis.GlobalManager.clearAllUselessParams(server,config,player);
                                player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                            }
                            boss.setHealth(correctHp);
                            bossHpWhenPlayerUseCmd.delete(bossUUID);
                            if (player != null) {
                                player.teleportTo(config.summonPos.x(),config.summonPos.y(),config.summonPos.z());
                            }
                        })
                    } else {
                        player.tell(Component.red(`您已经尝试过重返场地了!`));
                        return;
                    }
                } else {
                    player.tell(Component.gold(`战斗未开始或战斗已结束,该指令仅在战斗过程中被卡出场地时有效`));
                    return;
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Level} level
         * @returns {void}
         */
        checkAndHandlePlayerCountViolation : function (server,level) {
            for (const [id, config] of fieldConfig) { 
                var isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
                if (!isBossSummoned) continue;
                var isBossReallyExist = false;
                var entitiesInField = level.getEntitiesWithin(config.fieldAABB);
                if (entitiesInField.filter(entity => entity.type == "minecraft:player").size() >= 2) {
                    entitiesInField.filter(entity => entity.type != "minecraft:item" && entity.type != "minecraft:player").forEach(entity => {
                        if (entity.type == "cataclysm:ignis") {
                            this.execAfterBossDied(server ,entity ,level);
                            isBossReallyExist = true;
                        }
                        entity.discard();
                    })
                    entitiesInField.filter(entity => entity.type == "minecraft:player").forEach(player => {
                        player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                        player.tell(`场地内玩家数量异常,挑战已中断`);
                    }) 
                    if (!isBossReallyExist) {
                        single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"difficulty","");
                        single_Ignis.GlobalManager.updateFieldStatusToJson(FieldStatusFile,config.fieldOrBossId,"isBossSummoned",false);
                    }
                    console.log(`已清除人数违规场地的boss,场地id为${config.fieldOrBossId}`);
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player
         * @param {BlockPos} lootBlockPos
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.BlockRightClickedEventJS} event
         * @returns {void}
         */
        preventRewardTheft : function (player ,lootBlockPos ,server ,event) {
            var config = single_Ignis.getConfigManager.getConfigByWarnBlockPos(lootBlockPos);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            var playername = String(player.username);
            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            if (Obj == null) {
                console.error(`计分板异常!`);
                return;
            }
            if (server.scoreboard.hasPlayerScore(playername,Obj)) {
                console.log(`玩家${playername}获取了奖励`);
                return;
            } else {
                console.error(`非法玩家${playername}试图在场地${config.fieldOrBossId}获取奖励`);
                player.tell(Component.red(`你不应拿走不属于你的奖励`));
                player.tell(Component.gold(`[${y8}-${m8}-${d8} ${h8}:${min8}:${s8}]如果确实是你的,请将本消息与消息头的时间戟截图,并寻求管理员补发`));
                //player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z())  猖獗时再启用,避免莫名其妙的bug
                event.cancel();
            }
        }
    },
    /**管理玩家连接(上下线)的方法 */
    ConnectionManager : {   
        /**
         * @param {Internal.Player} player 
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        preventJoinField : function (player ,server) {
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                console.warn(`无登入标签`);
                return;
            }
            var playername = String(player.username);
            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            if (player.tags.contains(config.tagOrFieldObjName) && !server.scoreboard.hasPlayerScore(playername,Obj)) {
                player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                player.tags.remove(config.tagOrFieldObjName);
                player.tell(`已经有人在进行挑战了,请等待下一轮`);  //杜绝中途加入
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player 
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        execAfterPlayerLogin : function (player ,server) {
            server.scheduleInTicks(10,()=>{
                var UUid = String(player.uuid);
                summonOutTime.delete(UUid);

                player.setInvulnerable(true);  //登入后无敌
                single_Ignis.GlobalManager.IpCheck(server,player);

                if (player.tags.isEmpty()) return;

                if (player.tags.contains("Exited")) {
                    player.tags.remove("Exited");
                    player.tell(Component.red(`战斗过程中退场,被遣返回大厅`));  //战斗中掉线回到大厅
                }

                var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
                if (config == null) {
                    console.log(`玩家${player.username}无登入标签`);
                    return;
                }

                this.preventJoinField(player,server);
                
            })
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player 
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        execAfterPlayerLogout : function (player ,server) {
            var playername = String(player.username);
            playerToFieldReflection.delete(playername);
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                console.log(`玩家${playername}无登出标签`);
                return;
            }

            if (player.tags.isEmpty()) return;

            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            if (player.tags.contains(config.tagOrFieldObjName) && server.scoreboard.hasPlayerScore(playername,Obj)) {
                single_Ignis.FieldManager.tryDiscardBossByPlayer(server,player,overworld);
                player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                player.addTag("Exited");
                single_Ignis.GlobalManager.clearAllUselessParams(server,config,player);
            }  //战斗中退出传送
        }
    },
    /**管理自定义buff/debuff的方法 */
    CustomEffectionManager: {  
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {configDetails} [config]
         * @param {number} [fieldId]
         * @returns {Internal.Objective | null}
         */
        getCustomEffectionsScoreboard : function (server ,config ,fieldId) { 
            var currentFieldId;
            if (config != null) {
                currentFieldId = config.fieldOrBossId;
            } else if (config == null && fieldId != null) {
                currentFieldId = fieldId;
            } else {
                console.error(`无法获取到场地ID`);
                return null;
            }
            var customEffectionsObjName = customEffections.get("basicConfig").ObjName;
            var finalObjName = customEffectionsObjName + currentFieldId;
            var obj = server.scoreboard.getObjective(finalObjName);
            return obj;
        },
    //===============================================================================================
        /**
         * 战斗即将开始时,初始化自定义效果计分板(与场地绑定)
         * @param {Internal.MinecraftServer} server 
         * @param {number} fieldId
         * @returns {void}
         */
        customEffectionsInit : function (server ,fieldId) { 
            var basicConfigParams = customEffections.get("basicConfig");
            var finalObjName = basicConfigParams.ObjName + fieldId;
            var customEffectionObj = server.scoreboard.getObjective(finalObjName);
            if (customEffectionObj == null) {
                server.runCommandSilent(`/scoreboard objectives add ${finalObjName} dummy "${basicConfigParams.ObjDisplayName}"`);
                console.log(`自定义效果计分板初始化完成`);
            }
            server.scheduleInTicks(1 ,() => {
                customEffectionObj = this.getCustomEffectionsScoreboard(server,null,fieldId);
                if (customEffectionObj == null) {
                    console.error(`计分板异常!`);
                    return;
                }
                this.deepWoundInit(server ,customEffectionObj);
            })
        },
    //===============================================================================================
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Objective} customEffObj
         * @returns {void}
         */
        deepWoundInit : function (server ,customEffObj) {
            var deepWoundParams = customEffections.get("deepWound");
            if (!server.scoreboard.hasPlayerScore(deepWoundParams.effectionfakeCnPlayerName,customEffObj)) {
                server.runCommandSilent(`/scoreboard players set ${deepWoundParams.effectionfakeCnPlayerName} ${customEffObj.name} 0`);
            }
        },
    //===============================================================================================
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {DamageSource} source 
         * @returns {void} 
         */
        execCustomEffectionLevelWhenHurt : function (entity ,server ,source) {
            if (source.type().msgId() == "genericKill") return;
            var config = null;
            if (entity.isPlayer()) {
                config = single_Ignis.getConfigManager.getConfigByPlayerTags(entity);
                if (config == null) {
                    console.debug(`配置项为空!`);
                    return;
                }
            } else {
                return;
            }
            var deepWoundParams = customEffections.get("deepWound");
            var obj = this.getCustomEffectionsScoreboard(server,config);
            if (obj == null) {
                console.error(`计分板不存在!`);
                return;
            }

            var difficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
            var playerName = String(entity.username);
            if (!deepWoundLock.has(playerName) && difficulty == "hell") {
                var deepWoundLevel = server.scoreboard.getOrCreatePlayerScore(deepWoundParams.effectionfakeCnPlayerName,obj).score;
                var newDeepWoundLevel = deepWoundLevel;  
                if (deepWoundLevel >= deepWoundParams.maxLevel) return;
                if (source.actual != null) {
                    if (source.actual.persistentData.getInt("isBoss") != 0) {
                        newDeepWoundLevel = deepWoundLevel + 1;
                    } else {
                        if (random.nextInt(101) > 50) {
                            newDeepWoundLevel = deepWoundLevel + 1;
                        }
                    }
                } else {
                    if (random.nextInt(101) > 50) {
                        newDeepWoundLevel = deepWoundLevel + 1;
                    }
                }
                deepWoundLock.set(playerName,true);
                server.runCommandSilent(`/scoreboard players set ${deepWoundParams.effectionfakeCnPlayerName} ${obj.name} ${newDeepWoundLevel}`);
                server.scheduleInTicks(60,() => {
                    deepWoundLock.delete(playerName);
                })
            }
        },
    //===============================================================================================
        /**
         * 外部时钟一秒计时一次,内部时钟应为外部时钟的整数倍
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        execCustomEffectionLevelWhenTick : function (server) {
            var deepWoundParams = customEffections.get("deepWound")
            var customEffectionsObjName = customEffections.get("basicConfig").ObjName;
            var customEffObjList = server.scoreboard.objectives.stream().filter(obj => obj.name.startsWith(customEffectionsObjName)).toArray();  //应用jdk8引入的Stream操作,最终以数组收集
            for (const customEffObj of customEffObjList) {
                if (server.tickCount % deepWoundParams.decayTime == 0) {
                    var deepWoundLevel = server.scoreboard.getOrCreatePlayerScore(deepWoundParams.effectionfakeCnPlayerName,customEffObj).score;
                    var newDeepWoundLevel = Math.floor(deepWoundLevel * 2 / 3);
                    if (newDeepWoundLevel <= 0) {
                        newDeepWoundLevel = 0;
                    }
                    if (newDeepWoundLevel != deepWoundLevel) {
                        server.runCommandSilent(`/scoreboard players set ${deepWoundParams.effectionfakeCnPlayerName} ${customEffObj.name} ${newDeepWoundLevel}`);
                    }
                }
            }
        },
    //===============================================================================================
        /**
         * 两秒渲染一次
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        renderingEffToActionbar : function (server) {
            for (const [playerName ,strFieldId] of playerToFieldReflection) {
                let numberId = Number(strFieldId);
                let config = single_Ignis.getConfigManager.getConfigByID(numberId);
                if (config == null) {
                    console.error(`配置项不存在!`);
                    continue;
                }
                let stringBuffSituation = "";
                var customEffObj = this.getCustomEffectionsScoreboard(server,null,numberId);
                if (customEffObj == null) {
                    console.error(`玩家对应的场地的计分板异常!`);
                    continue;
                }
                for (const [type ,effDetails] of customEffections) {
                    if (type == "basicConfig") continue;
                    let typeName = effDetails.effectionfakeCnPlayerName;
                    let score = server.scoreboard.getOrCreatePlayerScore(effDetails.effectionfakeCnPlayerName,customEffObj).score;
                    if (score == 0) {
                        continue;
                    } else if (score > 0 && score <= 3) {
                        score = "\u00a7a" + score + "\u00a7f";
                    } else if (score >3 && score <=7) {
                        score = "\u00a7e" + score + "\u00a7f";
                    } else {
                        score = "\u00a7c" + score + "\u00a7f";
                    }
                    stringBuffSituation += typeName + ":" + score + "  ";
                }
                stringBuffSituation = stringBuffSituation.trim();
                server.runCommandSilent(`/title ${playerName} actionbar {"text":"${stringBuffSituation}"}`);
            }
        },
    //===============================================================================================
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {DamageSource} source 
         * @returns {void} 
         */
        execDeepWound : function (entity ,server) {
            if (entity.isPlayer()) {
                var config = single_Ignis.getConfigManager.getConfigByPlayerTags(entity);
                if (config == null) {
                    console.error(`配置项为空!`);
                    return;
                }
            } else {
                return;
            }
            var playerName = String(entity.username);
            
            var deepWoundParams = customEffections.get("deepWound");
            var obj = this.getCustomEffectionsScoreboard(server,config);
            if (obj == null) {
                console.error(`计分板不存在!`);
                return;
            }

            var deepWoundLevel = server.scoreboard.getOrCreatePlayerScore(deepWoundParams.effectionfakeCnPlayerName,obj).score;
            var currentHp = entity.health;
            if (currentHp - deepWoundLevel > 0) {
                server.runCommandSilent(`/damage ${playerName} ${deepWoundLevel} minecraft:generic_kill`);
            } else {
                entity.kill();
            }
        },
    },
    /**管理战斗流程/招式的方法 */
    BattleManager : {  
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Player} player  
         * @param {Internal.Level} level
         * @param {Internal.LivingEntityHurtEventJS} event
         * @returns {void}
         */
        execPlayerUndying : function (server ,player ,level ,event) {
            var playerUUid = String(player.stringUuid);
            player.setHealth(3);
            player.playSound("minecraft:item.totem.use");
            level.spawnParticles(new DustParticleOptions(new Vec3f(0.0,1.0,0.50196),0.9), false, player.x, player.y + 1, player.z, 1, 1, 1, 1000, 1)
            player.setInvulnerable(true);
            PlayerHasDied.set(playerUUid,1);
            server.tell(`三阶段不死效果已被触发,剩余0次`);
            server.scheduleInTicks(60,() => {
                player.setInvulnerable(false);
                server.tell(`不死效果已结束`)
            })
            event.cancel();
        },
    //===============================================================================================
        /**
         * 这个方法走Internal.LivingHurtEvent事件下的自定义全局LivingHurtHandler方法
         * @param {Internal.LivingEntity} entity 
         * @param {DamageSource} source 
         * @param {number} amount - 受到的原始伤害量
         * @param {Internal.LivingHurtEvent} event
         * @returns {void} 
         */
        execDamageBoost : function (entity ,source ,amount ,event) {
            if (entity.isPlayer()) {  //source.actual可以为null,不允许直接调用actual
                if (single_Ignis.getConfigManager.getConfigByPlayerTags(entity) == null) {
                    return;
                }
                var difficulty = single_Ignis.GlobalManager.getFieldStatusByPlayerFromCache(entity,"difficulty");
                if (difficulty == null || difficulty == "") {
                    console.error(`难度获取失败!`);
                    return;
                }
                if (source.actual != null) {
                    event.setAmount(amount * difficultyParameter.get(difficulty).enemyDamageMultiplier);
                } else if (source.actual == null) {
                    if (source.type().msgId() == "magic") {
                        event.setAmount(amount * difficultyParameter.get(difficulty).extraFireballOrMagicDamageScale);
                    }
                    if (source.type().msgId() == "explosion") {
                        event.setAmount(amount * difficultyParameter.get(difficulty).extraFireballOrExplosionDamageScale);
                    }
                }
            }
        },
    //===============================================================================================
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {number} damage 
         * @param {DamageSource} source 
         * @param {Internal.Level} level
         * @param {Internal.LivingEntityHurtEventJS} event
         * @returns {void} - 简单模式目前不可用(0.0)
         */
        execRealDamage : function (entity, server ,damage ,source ,level ,event) {
            if (source.type().msgId() == "genericKill") return;
            if (entity.isPlayer()) {  
                if (source.actual != null) {
                    var playerUUid = String(entity.stringUuid);
                    var playerName = String(entity.username);
                    var config = single_Ignis.getConfigManager.getConfigByPlayerTags(entity);
                    if (config == null) {
                        console.error(`配置项为空!`);
                        return;
                    }
                    var difficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                    var currentPlayerHp = entity.health;
                    if (difficulty == "easy") return;
                    if (source.actual.persistentData.getInt("isBoss") != 0) {  //为Boss 
                        this.execHealthDecay(entity,server,source,difficulty); 
                        if (source.actual.health < source.actual.maxHealth / 3) { 
                            var realDamage = damage * difficultyParameter.get(difficulty).enemyDamageMultiplier * difficultyParameter.get(difficulty).realDamageMultiplier;
                            if (realDamage < currentPlayerHp) {
                                server.runCommandSilent(`/damage ${playerName} ${realDamage} minecraft:out_of_world`);
                            }
                            if (realDamage > currentPlayerHp) {
                                if (!PlayerHasDied.has(playerUUid)) {
                                    this.execPlayerUndying(server,entity,level,event);
                                } else {
                                    server.runCommandSilent(`/damage ${playerName} ${realDamage} minecraft:out_of_world`);
                                }
                            }
                            event.cancel();
                        }
                    }
                    if (source.actual.persistentData.getInt("isFinalTurn") != 0) { //为最终回合小怪
                        var servantDamage = entity.maxHealth * difficultyParameter.get(difficulty).finalServantDmgMultiplier;
                        if (servantDamage < currentPlayerHp) {
                            server.runCommandSilent(`/damage ${playerName} ${servantDamage} minecraft:out_of_world`);
                        }
                        if (servantDamage > currentPlayerHp) {
                            if (!PlayerHasDied.has(playerUUid)) {
                                this.execPlayerUndying(server,entity,level,event);
                            } else {
                                server.runCommandSilent(`/damage ${playerName} ${servantDamage} minecraft:out_of_world`);
                            }
                        }
                        this.execHealthDecay(entity,server,source,difficulty);
                        event.cancel();
                    }
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {DamageSource} source 
         * @param {string} difficulty
         * @returns {void} - 简单模式目前不可用(0.0)
         */
        execHealthDecay : function (entity, server ,source ,difficulty) {
            if (entity.isPlayer()) {  
                if (source.actual != null) {
                    var playerName = String(entity.username);
                    if (difficulty == null) {
                        console.error(`难度为空!`);
                        return;
                    }
                    var extraMaxHealth = 0;
                    if (entity.maxHealth > DEFAULT_MAX_HEALTH) {
                        if (playerExtraMaxHpMap.get(playerName) != null) {
                            extraMaxHealth = playerExtraMaxHpMap.get(playerName);
                        } else {
                            extraMaxHealth = entity.maxHealth - DEFAULT_MAX_HEALTH;
                            playerExtraMaxHpMap.set(playerName,extraMaxHealth);
                        }
                    } else {
                        if (playerExtraMaxHpMap.get(playerName) != null) {
                            extraMaxHealth = playerExtraMaxHpMap.get(playerName);
                        } else {
                            var tempMaxHpCache = entity.maxHealth;
                            entity.setMaxHealth(20);
                            extraMaxHealth = entity.maxHealth - DEFAULT_MAX_HEALTH;
                            playerExtraMaxHpMap.set(playerName,extraMaxHealth);
                            entity.setMaxHealth(tempMaxHpCache - extraMaxHealth);
                        }
                    }
                    var entityPersistentData = source.actual.persistentData;
                    if (entityPersistentData.getInt("canDecayHealth") != 0) { //会对最大生命值造成损伤
                        var currentPlayerMaxHealth = entity.maxHealth;
                        var maxHPDecayCd = difficultyParameter.get(difficulty).healthDecayCooldown;
                        var maxHPDecayCount = 0;
                        if (entityPersistentData.getInt("isBoss") != 0) {
                            maxHPDecayCount = difficultyParameter.get(difficulty).bossMaxHealthDecayCount;
                        } else if (entityPersistentData.getInt("isServant") != 0) {
                            maxHPDecayCount = difficultyParameter.get(difficulty).servantMaxHealthDecayCount;
                        }
                        if (!maxHealthDecay.has(playerName)) {
                            if (currentPlayerMaxHealth - maxHPDecayCount >= 1) {
                                entity.setMaxHealth(currentPlayerMaxHealth - maxHPDecayCount - extraMaxHealth);
                            } else {
                                entity.setMaxHealth(-19 - extraMaxHealth);
                            }
                            maxHealthDecay.set(playerName ,true);
                            server.scheduleInTicks(maxHPDecayCd, () => {
                                maxHealthDecay.delete(playerName);
                            })
                        } 
                    }
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.LivingEntity} entity 
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level
         * @returns {void}
         */

        execIgnisStageChange : function (entity ,server ,level) {
            var entityUUID = String(entity.stringUuid);
            if (entity.health < entity.maxHealth/3*2 && !IIStageIgnis.has(entityUUID) && !IIIStageIgnis.has(entityUUID) && !(entity.persistentData.getInt("isBoss") == 0)) {
                IIStageIgnis.set(entityUUID,1);
                maxRegenationHp.set(entityUUID,(entity.maxHealth / 3) * 2);
                if (entity.persistentData.get("difficulty").asString != "easy") {
                    this.summonServantMonster(server,level,entity,false);
                }
            }
            if (entity.health < entity.maxHealth/3 && !IIIStageIgnis.has(entityUUID) && !(entity.persistentData.getInt("isBoss") == 0) && entity.isAlive()) {
                entity.setInvulnerable(true);
                maxRegenationHp.set(entityUUID,entity.maxHealth / 3);
                IIIStageIgnis.set(entityUUID,1);
                IIStageIgnis.delete(entityUUID);
                if (entity.persistentData.get("difficulty").asString != "easy") {
                    this.summonServantMonster(server,level,entity,false);
                }
                server.scheduleInTicks(300,() => {
                    entity.setInvulnerable(false);
                })
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.LivingEntity} entity 
         * @returns {void}
         */
        execIgnisGetAttacked : function (entity) {
            var entityUUID = String(entity.uuid);
            if (hitCount.get(entityUUID) == null) {
                hitCount.set(entityUUID,1);
            }
            if (hitCount.get(entityUUID) < 5) {
                hitCount.set(entityUUID,hitCount.get(entityUUID) + 1);
            } else {
                hitCount.delete(entityUUID);
                var resistance = entity.health/entity.maxHealth
                if (resistance < 0.5) {
                    resistance = 0.5;
                }
                entity.setAttributeBaseValue("l2damagetracker:damage_reduction",resistance);
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @returns {void}
         */
        autoIgnisRegeneration : function (server) {
            var ignies = server.entities.filter(entities => entities.type == "cataclysm:ignis")
            for (const ignis of ignies) {
                if (ignis.persistentData.get("difficulty").asString == "easy") continue;
                var entityUUID = String(ignis.stringUuid);
                if (maxRegenationHp.has(entityUUID) && ignis.health < maxRegenationHp.get(entityUUID) && ignis.isAlive()) {    
                    ignis.setHealth(ignis.health + 2);
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} p 
         * @param {number} delta
         * @returns {Vec3d[]}
         */
        predictNextPosition : function (p,delta) {
            var pos0 = p.position();
            var pos1 = p.position().add((new Vec3d(0,delta,0)));
            var pos2 = p.position().add((new Vec3d(0,-delta,0)));
            var pos3 = p.position().add((new Vec3d(-delta,0,-delta)));
            var pos4 = p.position().add((new Vec3d(delta,0,delta)));
            var pos5 = p.position().add((new Vec3d(delta,0,-delta)));
            var pos6 = p.position().add((new Vec3d(-delta,0,delta)));
            var posArr = [pos0,pos1,pos2,pos3,pos4,pos5,pos6];
            return posArr;
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Level} level
         * @param {configDetails} config
         * @param {number} extraAccelerationScale
         * @returns {void}
         */
        summonSingleFireball : function (level ,config, extraAccelerationScale) {
            let scanAABB = config.fieldAABB;
            level.getEntitiesWithin(scanAABB).forEach(entity => {
                if (entity.type == "cataclysm:ignis") {
                    let player = level.getNearestPlayer(
                        entity.x, entity.y, entity.z, 50, 
                        p => config.fieldAABB.contains(p.position()) && !p.isSpectator() //在场地内并且不是旁观的(并且在boss50m内的)玩家
                    );   //最后一个参数为谓词,接收实体,返回false或true(即实体是否满足条件(实体是...)),以此来过滤实体,此处可用箭头函数校验  
                    //箭头函数如果不加花括号一般是直接起return作用,加花括号要返回必须加return (p => {return ...} 相当于 p => ...)
                    
                    if (player == null) {
                        console.debug("未找到玩家,无法召唤火球")
                        return;
                    }
                    
                    var playerPosArr = this.predictNextPosition(player,random.nextDouble(6));
                    var accelerationScale = 0.1 + extraAccelerationScale;
                    for(var i = 0;i < 7;i ++){
                        var fireball = level.createEntity("cataclysm:ignis_fireball");
                        fireball.setPos(entity.position().add((new Vec3d(0,6,0))));
                        var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                        var slowDirection = direction.scale(accelerationScale); //scale 点乘
                        var power = "[" + single_Ignis.GlobalManager.vec3dToArray(slowDirection).toString() + "]";
                        fireball.mergeNbt(`{timer:-100,power:${power}}`)
                        level.addFreshEntity(fireball);
                    }
                }
            })   
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level
         * @param {string} difficulty
         * @param {boolean} [useRandomWave]
         * @param {boolean} [useRandomSpeed]
         * @returns {void}
         */
        autoSummonIgnisFireball : function (server ,level ,difficulty ,useRandomWave ,useRandomSpeed) {
            if (useRandomWave == null) {
                useRandomWave = false;
            }
            if (useRandomSpeed == null) {
                useRandomSpeed = false;
            }
            
            for (const [id, config] of fieldConfig) {
                let isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
                if (!isBossSummoned) continue;
                let currentDifficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                if (!(currentDifficulty == difficulty)) continue;
                let currentConfig = config;
                let maxFireballWave = difficultyParameter.get(currentDifficulty).fireballMaxWaveCount;
                let maxExtraAccelerationScale = difficultyParameter.get(currentDifficulty).extraFireballAccelerationScale;
                var finalFireballWave;
                if (!useRandomWave) {
                    if (maxFireballWave > 1) {
                        finalFireballWave = maxFireballWave;
                    } else {
                        finalFireballWave = 1;
                    }
                } else {
                    var minFireballWave = maxFireballWave - 2;
                    if (minFireballWave < 1) {
                        minFireballWave = 1;
                    }
                    finalFireballWave = random.nextInt(minFireballWave,maxFireballWave + 1)  //nextInt(3,5)就是[3,5)
                }

                for (let wave = 0; wave < finalFireballWave; wave++) {
                    let finalExtraAccelerationScale;
                    if (!useRandomSpeed) {
                        finalExtraAccelerationScale = maxExtraAccelerationScale;
                    } else {
                        finalExtraAccelerationScale = Math.round(random.nextFloat(0,maxExtraAccelerationScale + 0.001) * 100) / 100;
                    }
                    server.scheduleInTicks(10 * wave , () => {
                        this.summonSingleFireball(level, currentConfig, finalExtraAccelerationScale);
                    })
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.LivingEntity} entity 
         * @param {DamageSource} source
         * @returns {void}
         */
        addDebuffWhenPlayerGetHit : function (entity ,source ,server) {
            if (source.type().msgId() == "genericKill") return;
            if (entity.isPlayer()) {
                var playerName = String(entity.username);
                if (source.actual == null) return;
                if (source.actual.persistentData.getInt("isBoss") == 0) return;
                
                var config = single_Ignis.getConfigManager.getConfigByID(source.actual.persistentData.getInt("ID"))
                if (!debuffLock.has(playerName)) {
                    var difficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                    var addDebuffFlag = random.nextInt(100) + 1 < difficultyParameter.get(difficulty).debuffProbability ? true : false ;
                    if (addDebuffFlag) {
                        var randomIndex1 = random.nextInt(5);
                        var randomIndex2 = random.nextInt(5);
                        while (randomIndex1 == randomIndex2) {
                            randomIndex2 = random.nextInt(5);
                        }
                        entity.addEffect(new MobEffectInstance(debuffType[randomIndex1].id,debuffType[randomIndex1].duration,debuffType[randomIndex1].lvl,false,false));
                        if (difficulty == "hard") {
                            entity.addEffect(new MobEffectInstance(debuffType[randomIndex2].id,debuffType[randomIndex2].duration,debuffType[randomIndex2].lvl,false,false));
                        }
                        debuffLock.set(playerName,true);
                        server.scheduleInTicks(100,() => {
                            debuffLock.delete(playerName);
                        })
                    }
                } 
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {number} WaitTime
         * @param {Internal.Level} level
         * @param {number} damage
         * @param {number} Duration
         * @param {number} Radius
         * @param {configDetails} config
         * @returns {void}
         */
        generateSingleFlameStrike: function (level ,WaitTime ,Duration ,damage ,Radius ,config) {
            var flameStrike = level.createEntity("cataclysm:flame_strike") 
            flameStrike.mergeNbt(`{WaitTime:${WaitTime},Duration:${Duration},damage:${damage}}`); //need confirm
            flameStrike.mergeNbt(`{Radius:${Radius}}`);
            flameStrike.setPos(random.nextDouble(config.fieldAABB.minX,config.fieldAABB.maxX),config.fieldHeight + 1,random.nextDouble(config.fieldAABB.minZ,config.fieldAABB.maxZ))
            var trySummonCount = 0
            while (level.getEntitiesWithin(flameStrike.boundingBox).filter(entity => entity.type == "cataclysm:flame_strike").size() != 0 && trySummonCount < 5) {
                flameStrike.setPos(random.nextDouble(config.fieldAABB.minX,config.fieldAABB.maxX),config.fieldHeight + 1,random.nextDouble(config.fieldAABB.minZ,config.fieldAABB.maxZ))
                if (airBlocks.has(String(flameStrike.block.offset(0,-1,0).id)) || !airBlocks.has(String(flameStrike.block.id)) ) {
                    flameStrike.setPos(random.nextDouble(config.fieldAABB.minX,config.fieldAABB.maxX),config.fieldHeight + 1,random.nextDouble(config.fieldAABB.minZ,config.fieldAABB.maxZ))
                }
                trySummonCount ++;
            }
            level.addFreshEntity(flameStrike);
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.Level} level
         * @param {boolean} isFinalTurn
         * @param {Internal.LivingEntity} [entity]
         * @param {string} difficulty
         * @returns {void} 
         */
        summonRandomFlameStrike : function (level ,server ,isFinalTurn ,difficulty ,entity) {
            var foreachCount = 0;
            if (!isFinalTurn) {
                for (const [id ,config] of fieldConfig) { //全局
                    var isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
                    if (!isBossSummoned) continue;
                    if (!(single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile) == difficulty)) continue;
                    
                    let currentConfig = config; //局部块(不能用var,会提升到全局(只是全局的重新赋值)),规避闭包陷阱(闭包捕获最终对象,如果循环结束后才捕获,那么将全部采用循环结束后的最终值) 
                    /**@type {string} */
                    let currentDifficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                    /**@type {boolean} */
                    let currentBossStatus = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile)
                    let currentDifficultyParam = difficultyParameter.get(currentDifficulty);
                    let adjustedDamage = Math.round(currentDifficultyParam.flameStrikeDamage / currentDifficultyParam.extraFireballOrMagicDamageScale);
                    server.scheduleInTicks(5 * foreachCount ,() => {
                        if (currentBossStatus) {
                            for (let i = 0; i < currentDifficultyParam.flameStrikeCount; i++) {
                                this.generateSingleFlameStrike(level ,currentDifficultyParam.flameStrikeWaitTime ,currentDifficultyParam.flameStrikeDuration ,adjustedDamage ,currentDifficultyParam.flameStrikeRadius ,currentConfig);
                            }
                        }
                    })
                    foreachCount ++;
                }
            } else if (isFinalTurn) {  //DeathEvent
                if (entity == null) {
                    console.error("最终回合实体不能为null");
                    return;
                }
                var config = single_Ignis.getConfigManager.getConfigByID(entity);
                var currentDifficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                if (currentDifficulty == "normal") {
                    let adjustedDamage = Math.round(15 / difficultyParameter.get(currentDifficulty).extraFireballOrMagicDamageScale);
                    for (var i = 0; i < random.nextInt(5,9); i++) { //大于等于5,小于9
                        this.generateSingleFlameStrike(level ,100 ,1800 ,adjustedDamage ,5.5 ,config);
                    }
                } else if (currentDifficulty == "hard") {
                    let adjustedDamage = Math.round(35 / difficultyParameter.get(currentDifficulty).extraFireballOrMagicDamageScale);
                    for (var i = 0; i < random.nextInt(6,9); i++) { //大于等于6,小于9
                        this.generateSingleFlameStrike(level ,100 ,120000 ,adjustedDamage ,6.5 ,config);
                    }
                } else if (currentDifficulty == "hell") {
                    let adjustedDamage = Math.round(35 / difficultyParameter.get(currentDifficulty).extraFireballOrMagicDamageScale);
                    for (var i = 0; i < random.nextInt(7,9); i++) { //大于等于7,小于9
                        this.generateSingleFlameStrike(level ,100 ,120000 ,adjustedDamage ,7 ,config);
                    }
                }
                //普通难度,生成5-8持续60秒的  damage 15 realdamage 7
                //困难难度.生成5-8永久持续的,直到焰魔死亡 damage 40 realdamage 15
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.LivingEntity} entity     
         * @param {Internal.Level} level
         * @returns {void}
         */
        bossBarTimerInit : function (server ,entity ,level) {
            var bossID = entity.persistentData.getInt("ID");
            var config = single_Ignis.getConfigManager.getConfigByID(entity);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            entity.setInvulnerable(true);
            server.runCommandSilent(`/bossbar add ${bossID} [{"text":"坚持住!还有","color":"yellow"},{"text":"${HOLD_ON_TIME_IN_SECONDS}","color":"red"},{"text":"秒结束战斗","color":"yellow"}]`)     
            server.runCommandSilent(`/bossbar set minecraft:${bossID} max ${HOLD_ON_TIME_IN_SECONDS}`);
            server.runCommandSilent(`/bossbar set minecraft:${bossID} value ${HOLD_ON_TIME_IN_SECONDS}`);
            server.runCommandSilent(`/bossbar set minecraft:${bossID} color red`);
            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player").forEach(player => {
                server.runCommandSilent(`/bossbar set minecraft:${bossID} players ${String(player.username)}`);
            })
            if (!activeBossbarTimer.has(bossID)) {
                activeBossbarTimer.set(bossID ,HOLD_ON_TIME_IN_SECONDS);
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.LivingEntity} entity     
         * @param {Internal.Level} level - 可以传入外部定义level而无需使用LevelEvents
         * @returns {void}
         */
        bossBarTimerCountDown : function (server ,level) {  
            for (const [bossId ,remainingTime] of activeBossbarTimer) {
                let config = single_Ignis.getConfigManager.getConfigByID(bossId);
                if (config == null) {
                    console.error(`配置项为空!`);
                    continue;
                }
                var currentDifficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
                if (currentDifficulty == "easy") return;
                /**@type {number} */
                if (remainingTime > 0) {
                    if (currentDifficulty == "normal") {
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} value ${remainingTime}`);
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} name [{"text":"坚持住!还有","color":"yellow"},{"text":"${remainingTime}","color":"red"},{"text":"秒结束战斗","color":"yellow"}]`);
                    } else if (currentDifficulty == "hard") {
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} value ${remainingTime}`);
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} name [{"text":"请在","color":"yellow"},{"text":"${remainingTime}","color":"red"},{"text":"秒内杀死全部仆从怪物并等待结束","color":"yellow"}]`);
                    } else if (currentDifficulty == "hell") {
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} value ${remainingTime}`);
                        server.runCommandSilent(`/bossbar set minecraft:${bossId} name [{"text":"请在","color":"yellow"},{"text":"${remainingTime}","color":"red"},{"text":"秒内杀死全部仆从怪物并等待结束","color":"yellow"}]`);
                    }
                    
                    if (remainingTime < 20) {
                        if (remainingTime % 2 == 0) {
                            server.runCommandSilent(`/bossbar set minecraft:${bossId} color red`);
                        } else {
                            server.runCommandSilent(`/bossbar set minecraft:${bossId} color white`);
                        }
                    }
                    activeBossbarTimer.set(bossId,remainingTime - 1);
                } else {
                    level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "cataclysm:ignis").forEach(ignis => {
                        var players = level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.type == "minecraft:player");
                        if (players.size() <= 0) {
                            console.error(`玩家数量为0`);
                            return;
                        }
                        var player = players.getFirst();
                        ignis.setInvulnerable(false);
                        if (currentDifficulty == "normal") {
                            server.scheduleInTicks(1,() => {
                                server.runCommandSilent(`/damage ${String(ignis.uuid)} 99999 minecraft:generic by ${String(player.username)}`);
                            })
                        } else if (currentDifficulty == "hard") {
                            var totalHpExist = 0;
                            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.persistentData.getInt("isFinalTurn") == 1).forEach(entity => {
                                totalHpExist += entity.health;
                                level.spawnParticles("minecraft:soul_fire_flame", false, entity.x, entity.y + 1, entity.z, 1, 1, 1, 1000, 0.8);
                                entity.setHealth(1);
                            })
                            ignis.setHealth(1 + totalHpExist * 1.2);
                        } else if (currentDifficulty == "hell") {
                            var totalHpExist = 0;
                            level.getEntitiesWithin(config.fieldAABB).filter(entity => entity.persistentData.getInt("isFinalTurn") == 1).forEach(entity => {
                                totalHpExist += entity.health;
                                level.spawnParticles("minecraft:soul_fire_flame", false, entity.x, entity.y + 1, entity.z, 1, 1, 1, 1000, 0.8);
                            })
                            ignis.setHealth(ignis.health + totalHpExist * 1.4);
                        }
                    })
                    activeBossbarTimer.delete(bossId);
                    server.runCommandSilent(`/bossbar remove minecraft:${bossId}`);
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Vec3d} pos  
         * @param {MonsterConfig} servant - 仆从的总类,包含其信息(从servantMonsterCfg获取)
         * @param {Internal.Level} level
         * @param {boolean} isFinalTurn
         * @param {string} playerName
         * @returns {void}
         */
        summonSingleServant : function (server ,pos ,servant ,level ,isFinalTurn ,playerName) {
            /**@type {Internal.LivingEntity} */
            var newServant = level.createEntity(servant.entityType);
            newServant.setMaxHealth(servant.HP);
            newServant.setHealth(servant.HP);
            newServant.setPos(pos);
            if (servant.entityType == "minecraft:phantom" || servant.entityType == "cataclysm:the_harbinger") {
                newServant.setPos(pos.x(), pos.y() + 5, pos.z());
            }
            if (servant.entityType == "cataclysm:the_harbinger") {
                newServant.mergeNbt(`{isBoss:1}`);
            }
            newServant.mergeNbt(`{PersistenceRequired:${servant.PersistenceRequired}}`);
            newServant.setAttributeBaseValue("tacz:tacz.bullet_resistance",1 - servant.bulletDamageMultiplier);
            newServant.setGlowing(true);
            newServant.setAttributeBaseValue("minecraft:generic.follow_range",50);
            newServant.persistentData.merge(`{isServant:1}`)
            if (isFinalTurn) {
                newServant.persistentData.merge(`{isFinalTurn:1}`);
            }
            level.addFreshEntity(newServant);
            server.scheduleInTicks(2,() => {
                server.runCommandSilent(`/damage ${String(newServant.stringUuid)} 0.1 minecraft:generic by ${playerName}`)
            })
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.LivingEntity} entity     
         * @param {Internal.Level} level
         * @param {boolean} isFinalTurn
         * @returns {void}
         */
        summonServantMonster : function (server ,level ,entity ,isFinalTurn) {
            var config = single_Ignis.getConfigManager.getConfigByID(entity);
            if (config == null) {
                console.error(`配置项为空!`);
                return;
            }
            var currentDifficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"difficulty",FieldStatusFile);
            var player = level.getNearestPlayer(
                entity.x, entity.y, entity.z, 60, 
                p => config.fieldAABB.contains(p.position()) && !p.isSpectator() //在场地内并且不是旁观的(并且在boss50m内的)玩家
            );
            var playerName = String(player.username);
            if (!isFinalTurn) {
                if (currentDifficulty == "easy") return;
                var servantRevenant = ServantMonsterConfig.get(currentDifficulty).cataclysm_ignited_revenant;  
                for (var i = 0; i < servantRevenant.summonCount ; i++) {
                    /**@type {Internal.LivingEntity} */
                    this.summonSingleServant(server,config.summonPos,servantRevenant,level,false,playerName);
                }
            } else {
                if (currentDifficulty == "easy") return;
                var servantPiglin = ServantMonsterConfig.get(currentDifficulty).minecraft_piglin_brute;
                if (servantPiglin != null) {
                    for (var i = 0; i < servantPiglin.summonCount ; i++) {
                        /**@type {Internal.LivingEntity} */
                        this.summonSingleServant(server,config.summonPos,servantPiglin,level,true,playerName);
                    }
                }

                var servantPhantom = ServantMonsterConfig.get(currentDifficulty).minecraft_phantom;
                if (servantPhantom != null) {
                    for (var i = 0; i < servantPhantom.summonCount ; i++) {
                        /**@type {Internal.LivingEntity} */
                        this.summonSingleServant(server,config.summonPos,servantPhantom,level,true,playerName);
                    }
                }
                
                var servantHarbinger = ServantMonsterConfig.get(currentDifficulty).cataclysm_the_harbinger;
                if (servantHarbinger != null) {
                    for (var i = 0; i < servantHarbinger.summonCount ; i++) {
                        /**@type {Internal.LivingEntity} */
                        this.summonSingleServant(server,config.summonPos,servantHarbinger,level,true,playerName);
                    }
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @param {Internal.LivingEntity} entity     
         * @param {Internal.Level} level
         * @param {boolean} isFinalTurn
         * @returns {void}
         */
        execFinalTurn : function (entity ,server ,level) {
            entity.setHealth(1);
            entity.setAttributeBaseValue("minecraft:generic.movement_speed",0.33);
            var entityUUID = String(entity.stringUuid);
            isBossFinalTurn.set(entityUUID,true);
            var fieldId = entity.persistentData.getInt("ID");
            var difficulty = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(fieldId,"difficulty",FieldStatusFile);
            if (difficulty != "easy") {
                this.summonRandomFlameStrike(level,server,true,difficulty,entity);
                this.bossBarTimerInit(server,entity,level);
                this.summonServantMonster(server,level,entity,true);
            }
        }
    },
    /**管理全局通用的方法 */
    GlobalManager : {  
        /**
         * @param {Internal.Player} player
         * @param {boolean} isSettling
         * @returns {boolean} 
         */
        tellPlayerChallengeCount : function (player,isSettling) {
            /**@type {Map<playerName,[association_playerName]>} */
            var ExceptionIPs = JsonIO.read(ExceptionIPFile);
            var allFightCount = JsonIO.readJson(BossFightFile).getAsJsonObject();
            var SingleFightCount = allFightCount.get("SingleBoss").asJsonObject;
            if (player == null) {
                console.error(`玩家为空!`);
                return false;
            }
            var playername = String(player.username);

            var totalSFC = 0;

            var selfDetailSFC = 0;

            if (SingleFightCount.get(playername) != null) {
                selfDetailSFC = SingleFightCount.get(playername).asInt;
            } else {
                selfDetailSFC = 0;
            }

            if (isSettling) {
                //内存中的临时计算,不保存到文件
                selfDetailSFC += 1;
            }

            if (ExceptionIPs != null && ExceptionIPs.get(playername) != null) {
                for (const associatedPlayerName of ExceptionIPs.get(playername)) {
                    if (SingleFightCount.get(associatedPlayerName) == null) continue;
                    var detailSFC = SingleFightCount.get(associatedPlayerName).asInt;
                    totalSFC += detailSFC;
                }

                /**@type {number} */ 
                var totalDetailSFC = totalSFC + selfDetailSFC
                if (totalDetailSFC > maxSingleCfg) {
                    player.tell(Component.red(`今日你(与你的关联账号)已挑战成功\u00a7e${totalDetailSFC}\u00a7c次,奖励次数已用尽`));
                    return false;
                } else {
                    player.tell(`\u00a7b今日你(与你的关联账号)已挑战成功\u00a7e${totalDetailSFC}\u00a7b次,还有\u00a7e${maxSingleCfg - totalDetailSFC}\u00a7b次奖励次数`);
                    return true;
                }
            } else {
                if (selfDetailSFC > maxSingleCfg) {
                    player.tell(Component.red(`今日你已挑战成功\u00a7e${selfDetailSFC}\u00a7c次,奖励次数已用尽`));
                    return false;
                } else {
                    player.tell(`\u00a7b今日你已挑战成功\u00a7e${selfDetailSFC}\u00a7b次,还有\u00a7e${maxSingleCfg - selfDetailSFC}\u00a7b次奖励次数`);
                    return true;
                }
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server 
         * @returns {void} 
         */
        preventHangUp : function (server) {
            var players = server.players;
            for(const player of players) {
                var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
                if (config == null) continue;
                var UUid = String(player.stringUuid);
                var playername = String(player.username);
                var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
                if (player.tags.contains(config.tagOrFieldObjName) && !server.scoreboard.hasPlayerScore(playername,Obj)) {
                    if (!summonOutTime.has(UUid)) {
                        player.tell(`\u00a7e进入场地后请尽快召唤!`);
                        summonOutTime.set(UUid,1);
                    } else if (summonOutTime.has(UUid)) {
                        player.teleportTo(config.tpBackPos.x(),config.tpBackPos.y(),config.tpBackPos.z());
                        player.removeTag(config.tagOrFieldObjName);
                        player.tell(`\u00a7c因长时间未召唤被遣返`);
                        summonOutTime.delete(UUid);
                    }
                }
            }   
        },
    //---------------------------------------------------------------------------------------
        /**
         * @returns {void}
         */
        tryResetLootAndIpList : function () { 
            var tryPullCacheCount = 0;
            while (dateCache == -1) {
                console.warn(`无效的操作:日期为-1,即将同步文件中的最后更新时间...`);
                var bossFightFile = JsonIO.readJson(BossFightFile).getAsJsonObject();
                dateCache = bossFightFile.get("lastUpdateDay").asInt;
                tryPullCacheCount ++;
                if (tryPullCacheCount >= 5) {
                    console.error(`同步时间失败`);
                    return;
                }
            }
            
            if (d8 != dateCache && dateCache != -1) {
                JsonIO.write(BossFightFile,BossFightFileInit);  //重置boss每日记录
                var newBossFightFile = JsonIO.readJson(BossFightFile).getAsJsonObject();
                newBossFightFile.add("lastUpdateDay",d8);
                JsonIO.write(BossFightFile,newBossFightFile);
                JsonIO.write(ExceptionIPFile,excIPInit);
                dateCache = d8;
                console.log(`文件已重置完成`);
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @returns {void} -rebuild
         */
        removeBannedEntity : function (server) {
            blackListEntity.forEach(entityType => {
                server.entities.filter(entity => String(entity.type) == entityType).forEach(entity => entity.discard());
            })//定时删除黑名单实体
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @returns {void} -rebuild
         */
        removeBannedEffect : function (server) {
            bannedEffects.forEach(effectType => {
                server.runCommandSilent(`/effect clear @a ${effectType}`);
            }) //定时清除黑名单效果
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Player} player
         * @returns {void}
         */
        removeBannedItem : function (server ,player) {  //PlayerEvents.tick()用
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                return;
            }
            var playername = String(player.username)
            var Obj = server.scoreboard.getObjective(config.tagOrFieldObjName);
            if (player.tags.contains(config.tagOrFieldObjName) && server.scoreboard.hasPlayerScore(playername,Obj)) {
                bannedItem.forEach(itemType => {
                    player.inventory.clear(itemType);
                })
            }
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {Internal.Player} player
         * @returns {void}
         */
        IpCheck : function (server ,player) {
            const playerName = String(player.username);
    
            // 延迟1秒执行比对，确保数据已更新
            server.scheduleInTicks(100, () => {
                // 1. 安全读取数据
                const ipData = JsonIO.read(PlayerIPFile); //返回的不是严格意义的map,类似于普通Object?
                /*ipData.forEach((key,value)=>{
                    server.tell(key)
                    server.tell(value)
                })*/

                /*
                    var IpRecordInit = 
                        {
                            "player_name_regex": ".\\w+|\\w+",
                            "users": {
                                "Fugit_5414": [
                                    "112.224.190.208",
                                    "112.224.190.150",
                                    "112.224.162.29",
                                    "39.83.59.246"
                                ],
                                "SuJiu_": [
                                    "183.137.140.179",
                                    "220.189.74.202",
                                    "220.189.74.232",
                                    "220.189.74.199",
                                    "220.189.74.184",
                                    "36.21.64.31",
                                    "220.189.74.217"
                                ]
                            },
                            "banned_player": [],
                            "banned_ips": []
                        }
                */
                /*
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: player_name_regex
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: .\w+|\w+
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: users
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: {Fugit_5414=[112.224.190.208, 112.224.190.150], SuJiu_=[183.137.140.179], Wsditon=[202.98.122.130], Kazagomo=[117.183.79.110], OAMIAUG=[223.81.177.114], OnlyWilling=[58.209.186.211], YuriFlys=[111.192.166.38], Zhu555o=[58.19.92.8], QiuLan_Hoya=[222.247.37.126], Ke_Chao=[222.247.37.126], CChaTeaau=[119.5.219.133], fish114=[61.241.198.210], Saxiaoyu=[14.127.33.198], Zyesh=[39.160.171.119], HsMourait=[171.107.243.165, 154.86.5.140], Yingyiyi=[112.224.190.208], XYDisco=[111.25.253.116], BaiXuanXiao=[58.254.69.21], kavinShi157=[192.168.110.1], bksbwdw=[34.150.73.110], sifuji=[34.150.73.110], hlbhm=[36.49.66.11], Nakuzerofen=[39.86.241.69]}
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: banned_player
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]:
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]: banned_ips
                [Server] [12:40:07] [Server thread/INFO] [minecraft/MinecraftServer]:
                */
                /**@type {Map} */
                const usersMap = ipData.get("users");
                if (!usersMap) {
                    console.error("[IP检测] users字段不存在");
                    return;
                }

                const currentPlayerIps = usersMap.get(playerName);  //对于一个Json文件,如果被转为Map,那么键为键,值如果为Array则转为List/为对象则转为Map,为其他基本类型则维持不变
                
                if (!currentPlayerIps) {
                    console.error(`[IP检测] 玩家 ${playerName} 无IP记录`);
                    return;
                }
                
                //检测是否为数组，不是则转换
                
                function convertToJsArray(javaCollection) {
                    if (javaCollection && typeof javaCollection.toArray === 'function') {
                        let javaArray = javaCollection.toArray();
                        // 将 Java 数组转换为 JavaScript 数组
                        return Array.from(javaArray).map(ip => String(ip));
                    }
                    return [javaCollection]; //如果不是Java数组直接套数组括号(单对象处理)
                }

                const safeCurrentIps = convertToJsArray(currentPlayerIps);
                
                const currentIpSet = new Set(safeCurrentIps); //使用Set提高查找效率(将已有的IPArr元素放进Set)
                
                let duplicateReports = new Map(); //使用Map存储报告，按IP索引
                
                //遍历usersMap
                
                var allDuplicatePlayers = new Set();
                
                usersMap.forEach(
                    /**
                    * @param {string} storedName
                    * @param {[]} IpArr  
                    */
                    (storedName, IpArr) => {
                    if (storedName == playerName) return;
                    const AllIps = convertToJsArray(IpArr);
                    
                    //遍历除了自己以外的ipArr,并尝试匹配IP
                    AllIps.forEach(ip => {
                        if (currentIpSet.has(ip)) {
                            if (!duplicateReports.has(ip)) {
                                duplicateReports.set(ip, { //找到了一个重复IP,且没有被记录时,记录该IP
                                    ip: ip,
                                    players: []
                                });
                            }
                            
                            const report = duplicateReports.get(ip);
                            if (!report.players.includes(storedName)) {  //将对应玩家元素推入该IP报告列表
                                report.players.push(storedName);
                                allDuplicatePlayers.add(storedName);
                            }
                        }
                    });
                });
                
                //处理报告结果
                if (duplicateReports.size > 0) {
                    let reportMessage = `[IP警告] 玩家 ${playerName} 的IP有重复:\n`;
                    
                    duplicateReports.forEach(report => {
                        reportMessage += `- IP ${report.ip} 与以下玩家重复: ${report.players.join(', ')}\n`;
                    });
                    
                    console.error(reportMessage);
                    
                    // 发送警告给所有在线管理员
                    server.getPlayers().forEach(admin => {
                        if (admin.hasPermissions(4)) {
                            admin.tell(Component.red('[安全警告] ' + reportMessage));
                        }
                    });

                    if (JsonIO.readJson(ExceptionIPFile).isJsonNull()) {
                        JsonIO.write(ExceptionIPFile,excIPInit);
                    }
                    var ExceptionIPs = JsonIO.readJson(ExceptionIPFile).asJsonObject;
                    
                    var ExceptionIPArray = Array.from(allDuplicatePlayers);
                    
                    ExceptionIPs.add(playerName,ExceptionIPArray);  //建立IP重复文件
                    JsonIO.write(ExceptionIPFile,ExceptionIPs);
                }
            })
        },
        //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player
         * @param {string} paramName - 你想获取的具体状态值(difficulty|isBossSummoned)
         * @returns {string | boolean | null}
         */
        
        getFieldStatusByPlayerFromCache : function (player ,paramName) { 
            var playerName = String(player.username);
            if (playerToFieldReflection.get(playerName) == null) {
                console.warn(`无效的操作:该玩家未与场地建立链接,正在尝试建立链接...`);
                var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
                if (config == null) {
                    console.error(`无法通过该玩家获取到配置!建立链接失败`);
                    return null;
                }
                var fieldID = config.fieldOrBossId;
                playerToFieldReflection.set(playerName,fieldID.toString());
            }
            
            var strFieldIDInCache = playerToFieldReflection.get(playerName);

            var detailedStatus = FieldStatusCache.get(strFieldIDInCache);
            if (detailedStatus == null) {
                console.error(`该场地配置项不存在,问题id为${strFieldIDInCache}`);
                return null;
            }
            switch (paramName) {
                case "difficulty":
                    return String(detailedStatus.difficulty);

                case "isBossSummoned":
                    return detailedStatus.isBossSummoned;

                default:
                    console.error(`错误的参数名称`);
                    return null;
            }        
        },
        //---------------------------------------------------------------------------------------
        /**
         * @param {number} fieldId
         * @param {string} paramName - 你想获取的具体状态值(目前只有difficulty与isBossSummoned)
         * @param {Internal.Path} jsonPath
         * @returns {string | boolean | null}
         */
        
        getFieldStatusByIDFromCache : function (fieldId ,paramName ,jsonPath) { 
            var jsonedFieldId = fieldId.toString();
            var tryPullCacheCount = 0;
            while (FieldStatusCache.size == 0) {
                console.warn(`无效的操作:尝试从空缓存获取内容.即将重新拉取文件内容到缓存`);
                FieldStatusCache = JsonIO.read(jsonPath);  //不是严格意义的map,但是get()和set()仍然有效
                tryPullCacheCount ++;
                if (tryPullCacheCount >= 5) {
                    console.error(`拉取缓存失败`);
                    return null;
                }
            }

            var detailedStatus = FieldStatusCache.get(jsonedFieldId);
            if (detailedStatus == null) {
                console.error(`该场地配置项不存在,问题id为${jsonedFieldId}`);
                return null;
            }
            switch (paramName) {
                case "difficulty":
                    return String(detailedStatus.difficulty);

                case "isBossSummoned":
                    return detailedStatus.isBossSummoned;

                default:
                    console.error(`错误的参数名称`);
                    return null;
            }        
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Path} jsonPath
         * @param {number} fieldId
         * @param {string} paramName - 你想更改的具体状态值(目前只有difficulty与isBossSummoned)
         * @param {string | boolean} content -具体的更改值
         * @returns {void}
         */
        updateFieldStatusToJson : function (jsonPath ,fieldId ,paramName ,content) { 
            var jsonedFieldId = fieldId.toString();
            var fieldStatus = JsonIO.readJson(jsonPath).asJsonObject;
            var detailedStatus = fieldStatus.get(jsonedFieldId).asJsonObject;
            
            switch (paramName) {
                case "difficulty":
                    if (typeof content != "string") {
                        console.error(`错误的参数类型(非string)`);
                        return;
                    }
                    break;
                case "isBossSummoned":
                    if (typeof content != "boolean") {
                        console.error(`错误的参数类型(非boolean)`);
                        return;
                    }
                    break;
                default:
                    console.error(`错误的参数名称`);
                    return;
            }        
            detailedStatus.add(paramName,content);
            JsonIO.write(jsonPath,fieldStatus);
            FieldStatusCache = JsonIO.read(jsonPath);
        },
    //---------------------------------------------------------------------------------------
        /**
         * @param {Internal.Player} player
         * @param {Internal.ItemStack} item,
         * @returns {boolean} - 返回是否需要取消事件
         */
        preventDropItemWrongly : function (player ,item) {
            var config = single_Ignis.getConfigManager.getConfigByPlayerTags(player);
            if (config == null) {
                return false;
            }
            var isBossSummoned = single_Ignis.GlobalManager.getFieldStatusByIDFromCache(config.fieldOrBossId,"isBossSummoned",FieldStatusFile);
            if (isBossSummoned) {
                return true;
            } else {
                return false;
            }
        },
    //----------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {configDetails} config
         * @returns {void}
         */
        RemoveUselessObj : function (server,config) {
            var basicConfigParams = customEffections.get("basicConfig");
            var finalObjName = basicConfigParams.ObjName + config.fieldOrBossId;
            var Obj1 = server.scoreboard.getObjective(config.tagOrFieldObjName);
            var Obj2 = server.scoreboard.getObjective(finalObjName);
            if (Obj1 != null) {
                server.scoreboard.removeObjective(Obj1);
            }
            if (Obj2 != null) {
                server.scoreboard.removeObjective(Obj2);
            }
        },
    //----------------------------------------------------------------------------------
        /**
         * @param {Internal.MinecraftServer} server
         * @param {configDetails} config
         * @param {Internal.Player} player
         * @returns {void}
         */
        clearAllUselessParams : function (server ,config ,player) {
            var playerName = String(player.username);
            var playerUUID = String(player.stringUuid);
            playerToFieldReflection.delete(playerName);
            PlayerHasDied.delete(playerUUID);
            summonOutTime.delete(playerUUID);
            player.removeTag(config.tagOrFieldObjName);  //最后清除玩家队伍,在这之前boss需要被discard
            backingFieldPlayerList.delete(playerName);
            playerExtraMaxHpMap.delete(playerName);
            this.RemoveUselessObj(server,config);
        },
    //-----------------------------------------------------------------------------------
        /**
         * @param {Vec3d} vec3d 
         * @returns {[]}
         */
        vec3dToArray : function (vec3d) {
            var x = vec3d.x();
            var y = vec3d.y();
            var z = vec3d.z();
            return [x,y,z];
        }
    }
}













//Main function below here ========================
BlockEvents.rightClicked("minecraft:oak_button", event => {
    const {hand ,player ,block ,server ,level} = event;
    const {FieldManager,GlobalManager} = single_Ignis;
    if (hand != "MAIN_HAND") return;
    if (rightClickCooldown <= 0) {
        var hasBannedItem = FieldManager.scanBannedItem(player);
        if (hasBannedItem) return;
        rightClickCooldown = 20;
        if(FieldManager.TpIntoField(server ,block.pos ,level ,player)) {
            GlobalManager.tellPlayerChallengeCount(player,false);
            FieldManager.resetFieldByButton(server,defaultChargeBoxNBT,block.pos,level);
        } 
    }
})

BlockEvents.rightClicked("lootr:lootr_inventory", event => {
    const {player ,block ,server} = event;
    const {FieldManager} = single_Ignis;
    FieldManager.preventRewardTheft(player,block.pos,server,event);
})

BlockEvents.leftClicked(event => {
    const {block ,player ,level ,server} = event;
    const {FieldManager} = single_Ignis;
    if (block.id == "alexscaves:hazmat_warning_block") {
        FieldManager.preSummon(server,level,player,block,block.pos);
        FieldManager.ExecWhileSummoning(player,block.pos,level,server);
    }
})

EntityEvents.hurt(event => {
    const {level ,entity ,server ,source ,damage} = event;
    const {BattleManager ,CustomEffectionManager} = single_Ignis;
    if (entity.isPlayer() && (entity.persistentData.get("isBoss") == null)) {
        BattleManager.addDebuffWhenPlayerGetHit(entity,source,server);
        if (source.actual != null) {
            BattleManager.execRealDamage(entity,server,damage,source,level,event);
        }   //玩家boss开启时请注释掉这部分,或者以后需要重写玩家boss
        CustomEffectionManager.execCustomEffectionLevelWhenHurt(entity,server,source);
        CustomEffectionManager.execDeepWound(entity,server);
    } else if (entity.type == "cataclysm:ignis") {
        BattleManager.execIgnisStageChange(entity,server,level);
        BattleManager.execIgnisGetAttacked(entity);
        if (source.actual == null || !source.actual.isPlayer()) {
            event.cancel();
        }
    } else {
        if (source.actual == null || !source.actual.isPlayer()) {
            event.cancel();
        }
    }
    //debug
    /*if (source.actual != null && source.actual.username == "Fugit_5414") {
        entity.discard();
    }*/
})

/** @param {Internal.LivingHurtEvent} event */
global.LivingHurtHandler = event => {  //在受伤之中的最后部分执行
    const {entity ,amount ,source} = event;
    const {BattleManager} = single_Ignis;
    BattleManager.execDamageBoost(entity,source,amount,event);
}

EntityEvents.death(event => {
    let {entity ,server ,level} = event;
    const {FieldManager ,BattleManager} = single_Ignis;
    if (entity.isPlayer() && (entity.persistentData.get("isBoss") == null)) {
        server.scheduleInTicks(2 ,() => {
            if (entity.isDeadOrDying()) {
                FieldManager.execAfterPlayerDead(entity,server,level);
            }
        })
    }
    if (entity.type == "cataclysm:ignis") {
        var entityUUID = String(entity.stringUuid)
        if (!isBossFinalTurn.has(entityUUID)) {
            BattleManager.execFinalTurn(entity ,server ,level);
            event.cancel();
        } else {
            FieldManager.execAfterWinning(entity,level,server);
            FieldManager.execAfterBossDied(server,entity,level);
        }
    }
})

PlayerEvents.loggedIn(event => {
    const {player ,server} = event;
    const {ConnectionManager ,GlobalManager} = single_Ignis;
    ConnectionManager.execAfterPlayerLogin(player,server);
    GlobalManager.tryResetLootAndIpList();
})

PlayerEvents.loggedOut(event => {
    const {player ,server} = event;
    const {ConnectionManager} = single_Ignis;
    ConnectionManager.execAfterPlayerLogout(player,server);
})

PlayerEvents.respawned(event => {
    const {player} = event;
    player.setInvulnerable(true); //重生无敌
})

PlayerEvents.tick(event => {
    const {player ,server} = event;
    const {GlobalManager} = single_Ignis;
    if (server.tickCount % 15 == 0) {
        GlobalManager.removeBannedItem(server,player);
    }
})

ServerEvents.tick(event => {
    const {server} = event;
    const {GlobalManager ,BattleManager ,FieldManager ,CustomEffectionManager} = single_Ignis;
    if (rightClickCooldown > 0) {
        rightClickCooldown -= 1;
    }
    if (server.tickCount % clearIllegalBossCooldown == 0) {
        FieldManager.tryDiscardBossByGlobal(server,overworld);
    }
    if (server.tickCount % 1200 == 0) {
        GlobalManager.preventHangUp(server);
    }
    if (server.tickCount % 24000 == 0) {
        //server.tell(h8 + ":" + min8 + ":" + s8)  //debug
    }
    if (server.tickCount % 300 == 0) {
        FieldManager.checkAndHandlePlayerCountViolation(server,overworld);
    }
    if (server.tickCount % 60 == 0) {
        GlobalManager.removeBannedEntity(server);
    }
    if (server.tickCount % 10 == 0) {
        CustomEffectionManager.renderingEffToActionbar(server);
    }
    if (server.tickCount % 20 == 0) {
        GlobalManager.removeBannedEffect(server);
        BattleManager.autoIgnisRegeneration(server);
        BattleManager.bossBarTimerCountDown(server,overworld);
        CustomEffectionManager.execCustomEffectionLevelWhenTick(server);
    }

    if (server.tickCount % difficultyParameter.get("easy").fireballCooldown == 0) {
        BattleManager.autoSummonIgnisFireball(server,overworld,"easy");
    }

    if (server.tickCount % difficultyParameter.get("normal").fireballCooldown == 0) {
        BattleManager.autoSummonIgnisFireball(server,overworld,"normal");
    }

    if (server.tickCount % difficultyParameter.get("hard").fireballCooldown == 0) {
        BattleManager.autoSummonIgnisFireball(server,overworld,"hard");
    }

    if (server.tickCount % difficultyParameter.get("hell").fireballCooldown == 0) {
        BattleManager.autoSummonIgnisFireball(server,overworld,"hell",true,true);
    }

    if (server.tickCount % difficultyParameter.get("easy").flameSummonCooldown == 0) {
        BattleManager.summonRandomFlameStrike(overworld,server,false,"easy");
    }

    if (server.tickCount % difficultyParameter.get("normal").flameSummonCooldown == 0) {
        BattleManager.summonRandomFlameStrike(overworld,server,false,"normal");
    }

    if (server.tickCount % difficultyParameter.get("hard").flameSummonCooldown == 0) {
        BattleManager.summonRandomFlameStrike(overworld,server,false,"hard");
    }

    if (server.tickCount % difficultyParameter.get("hell").flameSummonCooldown == 0) {
        BattleManager.summonRandomFlameStrike(overworld,server,false,"hell");
    }
})

ServerEvents.entityLootTables(event => {
    event.addEntity("cataclysm:ignis",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    })
    event.addEntity("cataclysm:the_harbinger",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    })
    event.addEntity("minecraft:piglin_brute",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    })
    event.addEntity("minecraft:phantom",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    })
    event.addEntity("cataclysm:ignited_revenant",loot => {
        loot.addPool(pool => {
            pool.addItem("minecraft:air");
        })
    })
})  //清空不必要生物的掉落

ItemEvents.dropped(event => {
    const {entity ,item ,itemEntity} = event;
    const {GlobalManager} = single_Ignis;
    if (GlobalManager.preventDropItemWrongly(entity,item)) {
        entity.tell(`您已进入战斗状态,如需丢弃物品请打开物品栏丢弃(防止误丢)`);
        var itemstack = item;
        itemEntity.discard();
        if (entity.mainHandItem.id == "minecraft:air") {
            entity.setMainHandItem(itemstack);  //副手刷物品
        } else {
            var count = item.count + entity.mainHandItem.count;
            entity.mainHandItem.setCount(count);
        }
    }
})

ServerEvents.commandRegistry(event => {
    const {commands,arguments} = event;
    event.register(commands.literal("Backintofield")
    .requires(src => src.hasPermission(0))
        .executes(context=>{
            if (context.source.playerOrException == null) {
                context.source.sendFailure(`该指令不能由后台执行`);
                return 0;
            }
            return 1;
        })
    )
})

ServerEvents.command("Backintofield",event => {
    const {parseResults} = event;
    const {source} = parseResults.context;
    const {FieldManager} = single_Ignis;
    if (source.isPlayer()) {
        FieldManager.tryTpBattlePlayerBackToField(source);
    }
})

ServerEvents.chestLootTables(event => {
    event.addChest("challenge:easyreward",loot => {
        loot.addPool(money => {
            money.addItem("numismatics:bevel",100).count({min:1,max:1});
            money.setUniformRolls(1,1);
        })
    })
    event.addChest("challenge:normalreward",loot => {
        loot.addPool(money => {
            money.addItem("numismatics:bevel",100).count({min:1,max:1});
            money.setUniformRolls(1,1);
        })
        loot.addPool(haticon => {
            haticon.addItem("simplehats:haticon",100).count({min:1,max:1});
            haticon.setUniformRolls(1,1);
        })
        loot.addPool(hat => {
            hat.addItem("simplehats:hatbag_festive",100);
            hat.addItem("simplehats:hatbag_halloween",100);
            hat.addItem("simplehats:hatbag_summer",100);
            hat.addItem("simplehats:hatbag_easter",100);
            hat.addItem("simplehats:hatbag_epic",100);
            hat.addItem("simplehats:hatbag_rare",100);
            hat.addItem("simplehats:hatbag_uncommon",100);
            hat.setUniformRolls(1,1);
        })
    })
    event.addChest("challenge:hardreward",loot => {
        loot.addPool(haticon => {
            haticon.addItem("simplehats:haticon",100).count({min:1,max:1});
            haticon.setUniformRolls(1,1);
        })
        loot.addPool(hat => {
            hat.addItem("simplehats:hatbag_festive",100);
            hat.addItem("simplehats:hatbag_halloween",100);
            hat.addItem("simplehats:hatbag_summer",100);
            hat.addItem("simplehats:hatbag_easter",100);
            hat.addItem("simplehats:hatbag_epic",100);
            hat.addItem("simplehats:hatbag_rare",100);
            hat.addItem("simplehats:hatbag_uncommon",100);
            hat.setUniformRolls(2,2);
        })
    })
})

//更新日志
//1.0.0:完成初步框架功能,能够正常运行
//1.1.0:模块化高频重复部分
//1.2.0:1.修复bug
//      (1)修复了焰魔被陷阱击杀无法继续执行的bug
//      (2)修复偶现场地未被恢复的bug
//      2.新增抹除特定药水效果功能
//      3.更改 "次数用尽后不能再打" 为 "次数用尽后不能再获得奖励"
//1.3.0:1.加入了普通,困难两种模式,下调了简单难度
//      (1)加入了多种自动生成的招式(火球,烈焰阵,部分难度有小怪),并允许配置项控制
//      (2)为普通和困难难度加入了四阶段
//      (3)加入了难度处理系统
//      2.加入了IP检测,防止一人多开多得
//      3.加入了回场指令,防止中途被击出场外无法返回
//      4.现在的boss在无人时将被自动清除
//      5.重置文件改为更妥善的日期比对方法
//      6.修复了玩家复活甲导致场地信息提早被重置的问题
//      7.增加了防范中途加入的检查机制
//      8.修复了真实伤害未正常触发的问题
//      9.增加了在开局就告知玩家剩余多少次数的功能
//      10.完全重构模块化了各部分代码,现在主要是三个部分(Config,Method,Main)
//      11.修复了部分代码行出现空指针的问题,加上了null/undefined检测
//      12.现在玩家无法直接丢出主手物品,只能通过打开物品栏丢出(防止误丢)
//1.3.1:1.现在火球可以调整速度与召唤波次,分离了召唤单个火球阵与总调用召唤火球的代码
//      2.优化了召唤烈焰阵的数量的逻辑,现在可以动态通过难度参数调整
//      3.现在重置场地时将清除场地中的水方块与冰块,避免战斗过程中融化干扰战斗
//      4.拆分了最大生命值衰减的方法,现在将在处理真伤后以单独方法的形式触发,并且允许单独调控boss与小怪对玩家的衰减量
//      5.(预计)允许焰魔速度调整(未完工)
//      6.(预计)允许小怪速度调整(未完工)


//=================================when player is boss...
/*var accelerationScale = 0.1;  //乘数因子(调整火球加速度大小)
var radius = 5;
var hasTrackingStrike = false;
ItemEvents.firstRightClicked(event => {
    const {item,player,server,hand,target,level} = event;
    if (hand != "MAIN_HAND") return;
    if (player.username == "Fugit_5414") {
        var hit = target.hit;
        if (item.id == "minecraft:white_dye") {
            if (player.isShiftKeyDown()) {
                accelerationScale += 0.01;
                item.setHoverName(`召唤火球,火球速度${accelerationScale}`);
                return;
            }
            item.setHoverName(`召唤火球,火球速度${accelerationScale}`);
            if (hit != null) {
                var predictNextPosition = function (hitPos,delta) {
                    var pos0 = hitPos;
                    var pos1 = hitPos.add((new Vec3d(0,delta,0)));
                    var pos2 = hitPos.add((new Vec3d(0,-delta,0)));
                    var pos3 = hitPos.add((new Vec3d(-delta,0,-delta)));
                    var pos4 = hitPos.add((new Vec3d(delta,0,delta)));
                    var pos5 = hitPos.add((new Vec3d(delta,0,-delta)));
                    var pos6 = hitPos.add((new Vec3d(-delta,0,delta)));
                    var posArr = [pos0,pos1,pos2,pos3,pos4,pos5,pos6];
                    return posArr;
                }
                var vec3dToArray = function (vec3d) {
                    var x = vec3d.x();
                    var y = vec3d.y();
                    var z = vec3d.z();
                    return [x,y,z];
                }
                var playerPosArr = predictNextPosition(hit,random.nextDouble(6));
                
                for(var i = 0;i < 7;i ++){
                    var fireball = level.createEntity("cataclysm:ignis_fireball");
                    fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                    var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                    var slowDirection = direction.scale(accelerationScale); //scale 点乘
                    var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                    fireball.mergeNbt(`{timer:-100,power:${power}}`)
                    level.addFreshEntity(fireball);
                }
                server.scheduleInTicks(10,() => {
                    let playerPosArr = predictNextPosition(hit,random.nextDouble(6));
                    for(var i = 0;i < 7;i ++){
                        var fireball = level.createEntity("cataclysm:ignis_fireball");
                        fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                        var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                        var slowDirection = direction.scale(accelerationScale); //scale 点乘
                        var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                        fireball.mergeNbt(`{timer:-100,power:${power}}`)
                        level.addFreshEntity(fireball);
                    }
                })
            } else {
                var nearPlayer = level.getNearestPlayer(
                    player.x, player.y, player.z, 50, 
                    p => p != player && !p.isSpectator() //在场地内并且不是旁观的(并且在boss50m内的)玩家
                );   //最后一个参数为谓词,接收实体,返回false或true(即实体是否满足条件(实体是...)),以此来过滤实体,此处可用箭头函数校验  
                //箭头函数如果不加花括号一般是直接起return作用,加花括号要返回必须加return (p => {return ...} 相当于 p => ...)
                /**
                 * @param {Internal.Player} p 
                 * @param {number} delta
                 * @returns {Vec3d[]}
                 */
                /*if (nearPlayer == null) {
                    player.tell("未找到玩家,无法召唤火球");
                    return;
                }
                var predictNextPosition = function (p,delta) {
                    var pos0 = p.position();
                    var pos1 = p.position().add((new Vec3d(0,delta,0)));
                    var pos2 = p.position().add((new Vec3d(0,-delta,0)));
                    var pos3 = p.position().add((new Vec3d(-delta,0,-delta)));
                    var pos4 = p.position().add((new Vec3d(delta,0,delta)));
                    var pos5 = p.position().add((new Vec3d(delta,0,-delta)));
                    var pos6 = p.position().add((new Vec3d(-delta,0,delta)));
                    var posArr = [pos0,pos1,pos2,pos3,pos4,pos5,pos6];
                    return posArr;
                }
                /**
                 * @param {Vec3d} vec3d 
                 * @returns {[]}
                 */
                /*var vec3dToArray = function (vec3d) {
                    var x = vec3d.x();
                    var y = vec3d.y();
                    var z = vec3d.z();
                    return [x,y,z];
                }
                var playerPosArr = predictNextPosition(nearPlayer,random.nextDouble(6));
                for(var i = 0;i < 7;i ++){
                    var fireball = level.createEntity("cataclysm:ignis_fireball");
                    fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                    var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                    var slowDirection = direction.scale(accelerationScale); //scale 点乘
                    var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                    fireball.mergeNbt(`{timer:-100,power:${power}}`)
                    level.addFreshEntity(fireball);
                }
                server.scheduleInTicks(10,() => {
                    let playerPosArr = predictNextPosition(nearPlayer,random.nextDouble(6));
                    for(var i = 0;i < 7;i ++){
                        var fireball = level.createEntity("cataclysm:ignis_fireball");
                        fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                        var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                        var slowDirection = direction.scale(accelerationScale); //scale 点乘
                        var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                        fireball.mergeNbt(`{timer:-100,power:${power}}`)
                        level.addFreshEntity(fireball);
                    }
                })
            }
        }
        if (item.id == "minecraft:purple_dye") {
            item.setHoverName(`瞬间移动`);
            if (hit != null) {
                player.teleportTo(hit.x(),hit.y(),hit.z());
            } else {
                if (player.pitch < 0) {
                    player.teleportTo(player.x,player.y + 10,player.z);
                } else {
                    player.teleportTo(player.x,player.y - 5,player.z);
                }
            }
        }   
        if (item.id == "minecraft:orange_dye") {
            item.setHoverName(`召唤烈焰阵,烈焰阵半径${radius},等待时间${radius * 5 - 10}`);
            if (player.isShiftKeyDown()) {
                radius += 0.2;
                item.setHoverName(`召唤烈焰阵,烈焰阵半径${radius},等待时间${radius * 5 - 10}`);
                return;
            }
            var flameStrike = level.createEntity("cataclysm:flame_strike") ;
            flameStrike.mergeNbt(`{WaitTime:${radius * 5 - 10},Duration:100,damage:20}`); //need confirm
            flameStrike.mergeNbt(`{Radius:${radius}}`);
            if (hit != null) {
                flameStrike.setPos(hit.x(),hit.y(),hit.z());
            } else {
                flameStrike.setPos(player.x,player.y,player.z);
            }
            level.addFreshEntity(flameStrike);
        }
        if (item.id == "minecraft:gray_dye") {
            item.setHoverName(`效果无效(自我)`);
            server.runCommandSilent(`/effect clear ${String(player.username)}`)
        }
        if (item.id == "minecraft:red_dye") {
            item.setHoverName(`召唤追踪烈焰阵`);
            var flameStrike = level.createEntity("cataclysm:flame_strike") ;
            flameStrike.mergeNbt(`{WaitTime:0,Duration:0,damage:20}`); //need confirm
            flameStrike.mergeNbt(`{Radius:5}`);
            flameStrike.persistentData.merge(`{Tracking:1}`)
            hasTrackingStrike = true;
            if (hit != null) {
                flameStrike.setPos(hit.x(),hit.y(),hit.z());
            } else {
                flameStrike.setPos(player.x,player.y,player.z);
            }
            level.addFreshEntity(flameStrike);
        }
    }
})

ItemEvents.firstLeftClicked(event => {
    const {item,player,server,hand,target,level} = event;
    if (hand != "MAIN_HAND") return;
    if (player.username == "Fugit_5414") {
        if (item.id == "minecraft:white_dye") {
            if (player.isShiftKeyDown()) {
                accelerationScale -= 0.01;
                item.setHoverName(`召唤火球,火球速度${accelerationScale}`);
                return;
            } else {
                var nearPlayer = level.getEntitiesWithin(AABB.of(player.x - 40,player.y - 5 ,player.z - 40,player.x + 40,player.y + 20,player.z + 40)).filter(entity => entity.type == "minecraft:player");
                if (nearPlayer.size() <= 1) {
                    player.tell(`附近没有玩家,无法召唤火球`);
                    return;
                }
                nearPlayer.forEach(aplayer => {
                    if (player == aplayer) {

                    } else {
                        var predictNextPosition = function (p,delta) {
                            var pos0 = p.position();
                            var pos1 = p.position().add((new Vec3d(0,delta,0)));
                            var pos2 = p.position().add((new Vec3d(0,-delta,0)));
                            var pos3 = p.position().add((new Vec3d(-delta,0,-delta)));
                            var pos4 = p.position().add((new Vec3d(delta,0,delta)));
                            var pos5 = p.position().add((new Vec3d(delta,0,-delta)));
                            var pos6 = p.position().add((new Vec3d(-delta,0,delta)));
                            var posArr = [pos0,pos1,pos2,pos3,pos4,pos5,pos6];
                            return posArr;
                        }
                        /**
                         * @param {Vec3d} vec3d 
                         * @returns {[]}
                         */
                        /*var vec3dToArray = function (vec3d) {
                            var x = vec3d.x();
                            var y = vec3d.y();
                            var z = vec3d.z();
                            return [x,y,z];
                        }
                        var playerPosArr = predictNextPosition(player,random.nextDouble(6));
                        for(var i = 0;i < 7;i ++){
                            var fireball = level.createEntity("cataclysm:ignis_fireball");
                            fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                            var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                            var slowDirection = direction.scale(accelerationScale); //scale 点乘
                            var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                            fireball.mergeNbt(`{timer:-100,power:${power}}`)
                            level.addFreshEntity(fireball);
                        }
                        server.scheduleInTicks(10,() => {
                            let playerPosArr = predictNextPosition(player,random.nextDouble(6));
                            for(var i = 0;i < 7;i ++){
                                var fireball = level.createEntity("cataclysm:ignis_fireball");
                                fireball.setPos(player.position().add((new Vec3d(0,6,0))));
                                var direction = playerPosArr[i].subtract(fireball.position()).normalize(); //subtract 减法  //normalize 标准化(单位向量)
                                var slowDirection = direction.scale(accelerationScale); //scale 点乘
                                var power = "[" + vec3dToArray(slowDirection).toString() + "]";
                                fireball.mergeNbt(`{timer:-100,power:${power}}`)
                                level.addFreshEntity(fireball);
                            }
                        })
                    }
                })
            }   
        }
        if (item.id == "minecraft:purple_dye") {
            item.setHoverName(`瞬间移动`);
            var nearPlayer = level.getNearestPlayer(
                player.x, player.y, player.z, 50, 
                p => p != player && !p.isSpectator() //在场地内并且不是旁观的(并且在boss50m内的)玩家
            );
            if (nearPlayer == null) {
                player.tell("未找到玩家,无法传送");
                return;
            }
            server.runCommandSilent(`execute as ${String(nearPlayer.username)} run tp Fugit_5414 ^ ^ ^-1`);
        }   
        if (item.id == "minecraft:orange_dye") { //接近瞬移了,需要调整
            item.setHoverName(`召唤烈焰阵,烈焰阵半径${radius},等待时间${radius * 5 - 10}`);
            if (player.isShiftKeyDown()) {
                radius -= 0.2;
                item.setHoverName(`召唤烈焰阵,烈焰阵半径${radius},等待时间${radius * 5 - 10}`);
                return;
            } else {
                var nearPlayer = level.getEntitiesWithin(AABB.of(player.x - 40,player.y - 5 ,player.z - 40,player.x + 40,player.y + 20,player.z + 40)).filter(entity => entity.type == "minecraft:player");
                if (nearPlayer.size() <= 1) {
                    player.tell(`附近没有玩家,无法召唤烈焰阵`);
                    return;
                }
                nearPlayer.forEach(aplayer => {
                    if (player == aplayer) {
                     
                    } else {
                        var flameStrike = level.createEntity("cataclysm:flame_strike") ;
                        flameStrike.mergeNbt(`{WaitTime:${radius * 5 - 10},Duration:100,damage:20}`); //need confirm
                        flameStrike.mergeNbt(`{Radius:${radius}}`);
                        flameStrike.setPos(player.position());
                        level.addFreshEntity(flameStrike);
                    }
                })
            }
        }
        if (item.id == "minecraft:gray_dye") {
            item.setHoverName(`效果无效(他人)`);
            var nearPlayer = level.getEntitiesWithin(AABB.of(player.x - 40,player.y - 5 ,player.z - 40,player.x + 40,player.y + 20,player.z + 40)).filter(entity => entity.type == "minecraft:player");
            if (nearPlayer.size() <= 1) {
                player.tell(`附近没有玩家,无法清除他们身上的效果`);
                return;
            }
            nearPlayer.forEach(aplayer => {
                if (player == aplayer) {
                    
                } else {
                    server.runCommandSilent(`/effect clear ${String(aplayer.username)}`)
                }
            })
        }
        if (item.id == "minecraft:red_dye") {
            item.setHoverName(`销毁跟踪烈焰阵`);
            var flame_strikes = server.entities.filter(entity => entity.type == "cataclysm:flame_strike");
            var tracking_FS = flame_strikes.filter(strike => strike.persistentData.getInt("Tracking") != 0);
            var count = 0;
            tracking_FS.forEach(tracking_fs => {
                tracking_fs.discard();
                count++;
            })
            player.tell(`销毁了${count}个跟踪烈焰阵`);
            hasTrackingStrike = false
        }
    }
})

LevelEvents.tick(event => {
    const {server,level} = event;
    server.entities.forEach(entity => {
        entity.setInvulnerable(false);
    })
    if (level.isOverworld()) {
        if (server.tickCount % 100 == 0) {
            var ft = server.playerList.getPlayerByName(`Fugit_5414`);
            //ft.persistentData.merge({isBoss:1});
            ft.persistentData.remove(`isBoss`);
        }
        if (hasTrackingStrike) {
            var flame_strikes = server.entities.filter(entity => entity.type == "cataclysm:flame_strike");
            var tracking_FS = flame_strikes.filter(strike => strike.persistentData.getInt("Tracking") != 0);
            if (tracking_FS.isEmpty()) return;
            tracking_FS.forEach(tracking_fs => {
                tracking_fs.mergeNbt(`{Radius:5}`)
                var nearPlayer = level.getNearestPlayer(
                    tracking_fs.x, tracking_fs.y, tracking_fs.z, 50, 
                    p => String(p.username) != "Fugit_5414" && !p.isSpectator() && p.y > -41 //在场地内并且不是旁观的(并且在boss50m内的)玩家
                );
                if (nearPlayer == null) {
                    return;
                } else {
                    /**@type {Internal.Vec3d} */
                    /*var PlayerVec3d = nearPlayer.position();
                    /**@type {Internal.Vec3d} */
                    /*var tpVec3d = PlayerVec3d.subtract(tracking_fs.position());
                    /**@type {Internal.Vec3d} */
                    /*var noramlTpVec3d = tpVec3d.normalize();
                    /**@type {Internal.Vec3d} */
                    /*var slowVec3d = noramlTpVec3d.scale(0.7);
                    tracking_fs.setPos(slowVec3d.x() + tracking_fs.x,slowVec3d.y() + tracking_fs.y,slowVec3d.z() + tracking_fs.z);
                }
            })
        }
    }
})

EntityEvents.hurt(event => {
    const {damage,entity,source,server,level} = event;
    if (entity.isPlayer() && source.actual != null) {
        if (String(entity.username) != "Fugit_5414") {
            server.runCommandSilent(`damage ${String(entity.username)} ${damage * 0.3} minecraft:out_of_world`);
            if (!debuffLock.has(playerName)) {
                var addDebuffFlag = true;
                if (addDebuffFlag) {
                    var randomIndex1 = random.nextInt(5);
                    var randomIndex2 = random.nextInt(5);
                    while (randomIndex1 == randomIndex2) {
                        randomIndex2 = random.nextInt(5);
                    }
                    entity.addEffect(new MobEffectInstance(debuffType[randomIndex1].id,debuffType[randomIndex1].duration,debuffType[randomIndex1].lvl,false,false));
                    entity.addEffect(new MobEffectInstance(debuffType[randomIndex2].id,debuffType[randomIndex2].duration,debuffType[randomIndex2].lvl,false,false));
                    debuffLock.set(playerName,true);
                    server.scheduleInTicks(20,() => {
                        debuffLock.delete(playerName);
                    })
                }
            }
            event.cancel();
        }
    }
})

ItemEvents.entityInteracted("minecraft:snow_block",event => {
    const {server,entity,target} = event;
    if (String(entity.username) == "Fugit_5414") {
        entity.setInvulnerable(false);
        target.setInvulnerable(false);
    }
})*/
