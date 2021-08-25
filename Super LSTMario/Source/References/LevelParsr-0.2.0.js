var LevelParsr;
(function (LevelParsr_1) {
    "use strict";
    var LevelParsr = (function () {
        function LevelParsr() {
            this.RELEVANT_THINGS = ["Air", "Floor", "Block", "Brick", "Goomba", "Pipe", "PipePiranha", "Koopa", "Stone", "CastleSmall", "Coin",
                "PlatformGeneratorUp", "PlatformGeneratorDown", "TreeTop", "TreeTrunk", "TreeTrunkSolid", "Platform", "PlatformFloating", "PlatformSliding", "PlatformFalling", "PlatformTrack", "Scale", "CastleLarge", "Water", "CastleBlock", "CastleBridge", "Bowser", "CastleAxe",
                "Springboard", "Blooper", "CheepCheep", "BridgeBase", "Railing", "Podoboo", "HammerBro", "Lakitu", "Beetle", "ShroomTop", "ShroomTrunk", "Cannon",
                "StartInsideCastle", "EndInsideCastle", "EndOutsideCastle", "CastleBlockFireBalls"];
            this.RELEVANT_MACROS = ["Floor", "Pipe", "Fill", "Ceiling", "PlatformGenerator", "Tree", "Water", "StartInsideCastle",
                "EndInsideCastle", "EndOutsideCastle", "CastleSmall", "CastleLarge", "Scale", "Shroom", "Bridge"];
            this.CONTENTS = ["Mushroom", "Mushroom1Up", "Coin", "Star", "Vine", "HiddenCoin"];
            this.ORDER = ["TreeTrunk", "TreeTrunkSolid", "TreeTop"];
            this.macros = {
                "Fill": this.macroFillPreThings,
                "Floor": this.macroFloor,
                "Pipe": this.macroPipe,
                "Tree": this.macroTree,
                "Shroom": this.macroShroom,
                "Water": this.macroWater,
                "CastleSmall": this._coordsCastleSmall,
                "CastleLarge": this._coordsCastleLarge,
                "Ceiling": this.macroCeiling,
                "Bridge": this.macroBridge,
                "Scale": this._coordsScale,
                "PlatformGenerator": this._coordsPlatformGenerator,
                // "CheepsStart": macroCheepsStart,
                // "CheepsStop": macroCheepsStop,
                // "BulletBillsStart": macroBulletBillsStart,
                // "BulletBillsStop": macroBulletBillsStop,
                // "LakituStop": macroLakituStop,
                "StartInsideCastle": this.macroStartInsideCastle,
                "EndOutsideCastle": this._contentsEndOutsideCastle,
                "EndInsideCastle": this._contentsEndInsideCastle
            };
            this.randCounter = 0;
        }
        LevelParsr.prototype.parseOriginal = function (FSM) {
            var maps = FSM.settings.maps.library;
            for (var mapID in maps) {
                if (mapID == "Random")
                    continue;
                var map = maps[mapID];
                for (var areaID in map.areas) {
                    var area = map.areas[areaID];
                    this.parse(area.creation, mapID, areaID, FSM);
                }
            }
        };
        LevelParsr.prototype.parse = function (creation, mapID, area, FSM) {
            var _this = this;
            console.log("Length prior to filtering: " + creation.length);
            if (mapID == "Random") {
                creation = creation.filter(function (entry) {
                    return entry.reference.macro && _this.RELEVANT_MACROS.indexOf(entry.reference.macro) !== -1 ||
                        entry.thing && _this.RELEVANT_THINGS.indexOf(entry.thing.title) !== -1;
                });
            }
            else {
                creation = creation.filter(function (entry) {
                    return entry.macro && _this.RELEVANT_MACROS.indexOf(entry.macro) !== -1 ||
                        entry.thing && _this.RELEVANT_THINGS.indexOf(entry.thing) !== -1;
                });
            }
            console.log("Length after filtering: " + creation.length);
            var resultList = [];
            for (var _i = 0; _i < creation.length; _i++) {
                var entry = creation[_i];
                // let ref = entry.reference;
                // if (this.RELEVANT_MACROS.indexOf(ref.thing) !== -1) {
                //     let result = this.macros[ref.thing](ref, FSM);
                //     resultList.push(...result);
                // }
                // else {
                //     if (ref.thing == "Platform" && ref.sliding) {
                //         resultList.push(...this.macroSlidingPlatform(ref, FSM));
                //     }
                //     else resultList.push(ref);
                // }
                if (this.RELEVANT_MACROS.indexOf(entry.macro) !== -1) {
                    var result = this.macros[entry.macro](entry, FSM);
                    resultList.push.apply(resultList, result);
                }
                else {
                    if (entry.thing == "Platform" && entry.sliding) {
                        resultList.push.apply(resultList, this.macroSlidingPlatform(entry, FSM));
                    }
                    else if (entry.thing == "Platform" && entry.floating) {
                        resultList.push.apply(resultList, this.macroFloatingPlatform(entry, FSM));
                    }
                    else if (entry.thing == "Platform" && entry.falling) {
                        resultList.push({ "thing": "PlatformFalling", "x": entry.x, "y": entry.y });
                    }
                    else if (entry.thing == "Stone" && (entry.height || entry.width)) {
                        resultList.push.apply(resultList, this.macroStonePillar(entry, FSM));
                    }
                    else if (entry.thing == "CastleBlock" && entry.fireballs) {
                        resultList.push({ "thing": "CastleBlockFireBalls", "x": entry.x, "y": entry.y });
                    }
                    else
                        resultList.push(entry);
                }
            }
            console.log("Resulting list: " + resultList.length);
            // create grid array
            var lastXIndex = Math.max.apply(Math, resultList.map(function (o) { return o.x ? o.x : 0; }));
            var maxX = Math.ceil(lastXIndex / 8) + 1;
            var maxY = 14;
            var gridArray = this.createGridArray(maxX, maxY, 0);
            for (var _a = 0; _a < resultList.length; _a++) {
                var item = resultList[_a];
                // if x or y are not given, pick 0 as default
                if (gridArray[Math.ceil((item.x || 0) / 8)][Math.ceil((item.y || 0) / 8)] != this.getThingID({ "thing": "TreeTop" }))
                    gridArray[Math.ceil((item.x || 0) / 8)][Math.ceil((item.y || 0) / 8)] = this.getThingID(item);
            }
            this.printParsed(mapID, mapID == "Random" ? this.randCounter++ : area, gridArray);
            // randCounter++;
        };
        LevelParsr.prototype.parseLSTMToLevel = function (data, FSM) {
            // Within the game engine, the levels are objects describing the world
            // as separate objects with coordinates and properties.
            // Basic level structure
            var levelObj = {
                "name": "LSTMario",
                "locations": [
                    { "entry": "Castle" }
                ],
                "areas": [
                    {
                        "setting": "Overworld",
                        "creation": []
                    }
                ]
            };
            // We now need to populate the creation array:
            var creation = levelObj["areas"][0].creation;
            // the array indices can be treated as coordinates/8
            // loop over all indices and parse every block
            for (var _x = 0; _x < data.length; _x++) {
                for (var _y = 0; _y < data[_x].length; _y++) {
                    // Filter out Air
                    if (data[_x][_y] != 0) {
                        var result = this.parseBack(_x * 8, _y * 8, data[_x][_y]);
                        if (result)
                            creation.push(result);
                    }
                }
            }
            console.log("Parsed " + data.length);
            return levelObj;
        };
        LevelParsr.prototype.parseBack = function (_x, _y, _id) {
            var creationObj = {
                "x": _x,
                "y": _y
            };
            // normal blocks -> just set thing to the appropriate IDThing
            if (_id < this.RELEVANT_THINGS.length) {
                // For simplicity, some macros were turned into Things for the IDs, so we have to convert them back
                // Hacky stuff wooooooooo
                var idThing = this.getIDThing(_id);
                if (idThing == "PlatformGeneratorUp" || idThing == "PlatformGeneratorDown")
                    idThing = "PlatformGenerator";
                else if (idThing == "PipePiranha") {
                    idThing = "Pipe";
                    creationObj["piranha"] = true;
                }
                // PlatformTrack is used to describe the platform's movement, it's not used when parsing back
                if (idThing == "PlatformTrack")
                    return;
                // If macros contain idThing -> set macro instead of thing
                if (this.RELEVANT_MACROS.indexOf(idThing) != -1) {
                    creationObj["macro"] = idThing;
                    switch (idThing) {
                        case "Floor":
                            if (_y == 0)
                                creationObj["height"] = "Infinity";
                            break;
                        case "Pipe":
                            creationObj["height"] = "Infinity";
                        case "Water":
                            creationObj["width"] = 16;
                            break;
                        case "PlatformGenerator":
                            if (_id == this.RELEVANT_THINGS.indexOf("PlatformGeneratorDown"))
                                creationObj["direction"] = -1;
                            break;
                        case "EndOutsideCastle":
                        case "CastleSmall":
                        case "CastleLarge":
                            creationObj["y"] -= 8;
                            break;
                        default:
                            break;
                    }
                }
                else if (idThing == "Stone" && _y == 0) {
                    creationObj["thing"] = this.RELEVANT_THINGS[_id];
                    creationObj["height"] = "Infinity";
                }
                else if (idThing == "Platform") {
                    creationObj["thing"] = "Platform";
                    creationObj["width"] = 24;
                }
                else if (idThing == "PlatformSliding" || idThing == "PlatformFloating" || idThing == "PlatformFalling") {
                    // { "thing": "Platform", "x": 688, "y": 40, "width": 24, "sliding": true, "begin": 660, "end": 720 },
                    creationObj["thing"] = "Platform";
                    creationObj["width"] = 24;
                    if (idThing == "PlatformSliding") {
                        creationObj["sliding"] = true;
                        creationObj["begin"] = Math.max(_x - 32, 0);
                        creationObj["end"] = _x + 32;
                    }
                    else if (idThing == "PlatformFloating") {
                        creationObj["floating"] = true;
                        creationObj["begin"] = Math.max(_y - 16, 0);
                        creationObj["end"] = _y + 16;
                    }
                    else {
                        creationObj["falling"] = true;
                    }
                }
                else if (idThing == "TreeTrunk" || idThing == "TreeTrunkSolid" || idThing == "ShroomTrunk") {
                    creationObj["groupType"] = idThing == "TreeTrunkSolid" ? "Solid" : "Scenery";
                    creationObj["thing"] = idThing == "TreeTrunkSolid" ? "TreeTrunk" : idThing;
                    creationObj["height"] = "Infinity";
                    creationObj["width"] = 8;
                }
                else if (idThing == "CastleBlockFireBalls") {
                    // { "thing": "CastleBlock", "x": 160, "y": 46, "fireballs": 6, "hidden": true },
                    creationObj["thing"] = "CastleBlock";
                    creationObj["fireballs"] = 6;
                }
                else
                    creationObj["thing"] = this.RELEVANT_THINGS[_id];
            }
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length) {
                creationObj["thing"] = "Block";
                var content = this.CONTENTS[_id - this.RELEVANT_THINGS.length];
                if (content == "HiddenCoin") {
                    creationObj["contents"] = "Coin";
                    creationObj["hidden"] = true;
                }
                else
                    creationObj["contents"] = content;
            }
            else {
                creationObj["thing"] = "Brick";
                var content = this.CONTENTS[_id - this.RELEVANT_THINGS.length - this.CONTENTS.length];
                if (content == "HiddenCoin") {
                    creationObj["contents"] = "Coin";
                    creationObj["hidden"] = true;
                }
                else
                    creationObj["contents"] = content;
            }
            return creationObj;
        };
        //#region Utility
        LevelParsr.prototype.printParsed = function (location, area, arr) {
            var textFile = null;
            var text = JSON.stringify(arr);
            var data = new Blob([text], { type: 'octet/stream' });
            // If we are replacing a previously generated file we need to
            // manually revoke the object URL to avoid memory leaks.
            if (textFile !== null) {
                window.URL.revokeObjectURL(textFile);
            }
            textFile = window.URL.createObjectURL(data);
            var p = document.createElement("p");
            var a = document.createElement("a");
            a.innerText = location + "-" + area;
            a.setAttribute('href', textFile);
            a.setAttribute('download', location + "-" + area + ".json");
            p.appendChild(a);
            document.body.appendChild(p);
            // returns a URL you can use as a href
            // if (location == "Random")
            //     document.append(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
            // else
            //     document.append(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
        };
        LevelParsr.prototype.getThingID = function (entry) {
            switch (entry.thing) {
                case 'Block':
                    // The X entries after relevant things is reserved for the different block types
                    if (entry.contents)
                        return this.RELEVANT_THINGS.length + this.CONTENTS.indexOf(entry.hidden ? "HiddenCoin" : entry.contents);
                case 'Brick':
                    // The X entries after that are reserved for the different BRICK types
                    if (entry.contents)
                        return this.RELEVANT_THINGS.length + this.CONTENTS.length + this.CONTENTS.indexOf(entry.contents);
                default:
                    return this.RELEVANT_THINGS.indexOf(entry.thing);
            }
        };
        LevelParsr.prototype.getIDThing = function (id) {
            if (id < this.RELEVANT_THINGS.length)
                return this.RELEVANT_THINGS[id];
            if (id < this.RELEVANT_THINGS.length + this.CONTENTS.length)
                return "Block" + this.CONTENTS[id - this.RELEVANT_THINGS.length];
            return "Brick" + this.CONTENTS[id - this.RELEVANT_THINGS.length - this.CONTENTS.length];
        };
        LevelParsr.prototype.createGridArray = function (x, y, fill) {
            var gridArray = new Array(x);
            for (var _x = 0; _x < gridArray.length; _x++) {
                gridArray[_x] = new Array(y);
                for (var _y = 0; _y < y; _y++)
                    gridArray[_x][_y] = fill;
            }
            return gridArray;
        };
        LevelParsr.prototype.printArray = function (arr) {
            var resultArr = this.createGridArray(arr[0].length, arr.length, "");
            for (var x = 0; x < arr.length; x++) {
                for (var y = 0; y < arr[x].length; y++) {
                    resultArr[arr[x].length - y - 1][x] = this.getIDThing(arr[x][y]);
                }
            }
            console.log(resultArr);
        };
        LevelParsr.prototype.listUniqueThings = function (creation) {
            var _things = [];
            var _macros = [];
            for (var _i = 0; _i < creation.length; _i++) {
                var reference = creation[_i];
                if (reference.thing && _things.indexOf(reference.thing) === -1)
                    _things.push(reference.thing);
                if (reference.macro && _macros.indexOf(reference.macro) === -1)
                    _macros.push(reference.macro);
            }
            console.log({ things: _things, macros: _macros });
        };
        //#endregion
        //#region Macros
        // "Fill": FullScreenMario.FullScreenMario.prototype.macroFillPreThings,
        LevelParsr.prototype.macroFillPreThings = function (reference, FSM) {
            if (reference.thing == "CastleBlock" && reference.fireballs)
                reference.thing = "CastleBlockFireBalls";
            var xnum = reference.xnum || 1, ynum = reference.ynum || 1, xwidth = reference.xwidth || 8, yheight = reference.yheight || 8, x = reference.x || 0, yref = reference.y || 0, outputs = [], output, o = 0, y, i, j;
            for (i = 0; i < xnum; ++i) {
                y = yref;
                for (j = 0; j < ynum; ++j) {
                    output = {
                        "x": x,
                        "y": y,
                        "macro": undefined
                    };
                    outputs.push(FSM.proliferate(output, reference, true));
                    o += 1;
                    y += yheight;
                }
                x += xwidth;
            }
            return outputs;
        };
        // "Floor": FullScreenMario.FullScreenMario.prototype.macroFloor,
        LevelParsr.prototype.macroFloor = function (reference, FSM) {
            var startX = reference.x || 0, y = reference.y || 0, width = reference.width || 8, outputs = [], output;
            for (var _x = startX; _x < startX + width; _x += 8) {
                output = FSM.proliferate({
                    "thing": "Floor",
                    "x": _x,
                    "y": y,
                    "width": 8,
                    "height": "Infinity"
                }, reference, true);
                output.macro = undefined;
                outputs.push(output);
            }
            return outputs;
            // var x = reference.x || 0, y = reference.y || 0, floor = proliferate({
            //     "thing": "Floor",
            //     "x": x,
            //     "y": y,
            //     "width": (reference.width || 8),
            //     "height": "Infinity"
            // }, reference, true);
            // floor.macro = undefined;
            // return floor;
        };
        ;
        // "Pipe": FullScreenMario.FullScreenMario.prototype.macroPipe,
        LevelParsr.prototype.macroPipe = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, height = reference.height || 16, output = FSM.proliferate({
                "thing": (reference.piranha ? "PipePiranha" : "Pipe"),
                "x": x,
                "y": y,
                "width": 16,
                "height": reference.height === Infinity
                    ? "Infinity"
                    : reference.height || 8
            }, reference, true);
            output.macro = undefined;
            if (height === "Infinity" || height === Infinity)
                output.height = 99;
            else
                output.y += height;
            return [output];
        };
        ;
        // "Tree": FullScreenMario.FullScreenMario.prototype.macroTree,
        LevelParsr.prototype.macroTree = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, outputs = [];
            for (var _x = x; _x < x + width; _x += 8) {
                outputs.push({
                    "thing": "TreeTop",
                    "x": _x,
                    "y": y
                });
            }
            for (var _trunkX = x + 8; _trunkX < x + width - 8; _trunkX += 8) {
                for (var _trunkY = y - 8; _trunkY >= 0; _trunkY -= 8) {
                    outputs.push({
                        "thing": (reference.solidTrunk ? "TreeTrunkSolid" : "TreeTrunk"),
                        "x": _trunkX,
                        "y": _trunkY
                    });
                }
            }
            return outputs;
        };
        ;
        // "Shroom": FullScreenMario.FullScreenMario.prototype.macroShroom,
        LevelParsr.prototype.macroShroom = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [];
            for (var _x = x; _x < x + width; _x += 8) {
                output.push({
                    "thing": "ShroomTop",
                    "x": _x,
                    "y": y,
                    "width": 8
                });
            }
            if (width > 16) {
                output.push({
                    "thing": "ShroomTrunk",
                    "x": x + (width - 8) / 2,
                    "y": y - 8,
                    "height": Infinity,
                    "groupType": reference.solidTrunk ? "Solid" : "Scenery"
                });
            }
            return output;
        };
        ;
        // "Water": FullScreenMario.FullScreenMario.prototype.macroWater,
        LevelParsr.prototype.macroWater = function (reference, FSM) {
            var y = reference.y || 0, startX = reference.x || 0, width = reference.width || 16, endX = startX + width, output = [];
            for (var _x = startX; _x < endX; _x += 8) {
                output.push({
                    "thing": "Water",
                    "x": _x,
                    "y": y,
                    "height": "Infinity",
                    "width": 8
                });
            }
            return output;
        };
        ;
        // "Ceiling": FullScreenMario.FullScreenMario.prototype.macroCeiling,
        LevelParsr.prototype.macroCeiling = function (reference, FSM) {
            return FSM.LevelParser.macros["Fill"]({
                "thing": "Brick",
                "x": reference.x,
                "y": 88,
                "xnum": (reference.width / 8) | 0,
                "xwidth": 8
            }, FSM);
        };
        ;
        LevelParsr.prototype._coordsCastleSmall = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            return [{
                    "thing": "CastleSmall",
                    "x": x,
                    "y": y + 8
                }];
        };
        LevelParsr.prototype._coordsCastleLarge = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            return FSM.LevelParser.macros["CastleSmall"]({
                "x": x + 16,
                "y": y + 48
            }, FSM).concat([
                {
                    "thing": "CastleLarge",
                    "x": x + 16,
                    "y": y + 8,
                    "position": "end"
                }
            ]);
        };
        // "Bridge": FullScreenMario.FullScreenMario.prototype.macroBridge,
        LevelParsr.prototype.macroBridge = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = Math.max(reference.width || 0, 16), output = [];
            // Between any columns is a BridgeBase with a Railing on top
            // A beginning column reduces the width and pushes it forward
            if (reference.begin) {
                width -= 8;
                for (var _y = y; _y >= 0; _y -= 8) {
                    output.push({
                        "thing": "Stone",
                        "x": x,
                        "y": _y,
                        "height": "Infinity"
                    });
                }
                x += 8;
            }
            // An ending column just reduces the width 
            if (reference.end) {
                width -= 8;
                for (var _y = y; _y >= 0; _y -= 8) {
                    output.push({
                        "thing": "Stone",
                        "x": x + width,
                        "y": _y,
                        "height": "Infinity"
                    });
                }
            }
            for (var _x = x; _x < x + width; _x += 8) {
                output.push({ "thing": "BridgeBase", "x": _x, "y": y });
                output.push({ "thing": "Railing", "x": _x, "y": y + 8 });
            }
            return output;
        };
        ;
        LevelParsr.prototype._coordsScale = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            return [
                {
                    "thing": "Scale",
                    "x": x,
                    "y": y
                }];
        };
        LevelParsr.prototype._coordsPlatformGenerator = function (reference, FSM) {
            var direction = reference.direction || 1, x = reference.x || 0, width = reference.width || 24;
            return [{
                    "thing": (direction == 1 ? "PlatformGeneratorUp" : "PlatformGeneratorDown"),
                    "x": x + width / 2,
                    "y": 0
                }];
        };
        LevelParsr.prototype.macroSlidingPlatform = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 16, begin = reference.begin, end = reference.end, outputs = [], output;
            for (var _x = begin; _x < end; _x += 8) {
                output = {
                    "thing": "PlatformTrack",
                    "x": _x,
                    "y": y
                };
                outputs.push(output);
            }
            outputs.push(output = {
                "thing": "PlatformSliding",
                "x": x,
                "y": y
            });
            return outputs;
        };
        LevelParsr.prototype.macroFloatingPlatform = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 16, begin = reference.begin, end = reference.end, outputs = [], output;
            for (var _y = begin; _y < end; _y += 8) {
                output = {
                    "thing": "PlatformTrack",
                    "x": x,
                    "y": _y
                };
                outputs.push(output);
            }
            outputs.push({
                "thing": "PlatformFloating",
                "x": x,
                "y": y
            });
            return outputs;
        };
        LevelParsr.prototype.macroStonePillar = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, height = reference.height || 0, width = reference.width || 8, outputs = [];
            for (var _x = x; _x < x + width; _x += 8) {
                for (var _y = y; _y >= y - height; _y -= 8) {
                    outputs.push({
                        "thing": "Stone",
                        "x": _x,
                        "y": _y
                    });
                }
            }
            return outputs;
        };
        // "StartInsideCastle": FullScreenMario.FullScreenMario.prototype.macroStartInsideCastle,
        LevelParsr.prototype.macroStartInsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = (reference.width || 0) - 40;
            var output = [{
                    "thing": "StartInsideCastle",
                    "x": x,
                    "y": y
                }];
            if (width > 0) {
                output.push.apply(output, FSM.LevelParser.macros["Floor"]({
                    "macro": "Floor",
                    "x": x + 40,
                    "y": y + 24,
                    "width": width
                }, FSM));
            }
            return output;
        };
        ;
        LevelParsr.prototype._contentsEndOutsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            var output = [{
                    "thing": "EndOutsideCastle",
                    "x": x,
                    "y": y + 8
                }];
            // if (reference.large) {
            //     output.push(...FSM.LevelParser.macros["CastleLarge"]({
            //         "x": x + (reference.castleDistance || 24),
            //         "y": y,
            //     }, FSM));
            // }
            // else {
            //     output.push(...FSM.LevelParser.macros["CastleSmall"]({
            //         "x": x + (reference.castleDistance || 32),
            //         "y": y,
            //     }, FSM));
            // }
            return output;
        };
        LevelParsr.prototype._contentsEndInsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad";
            return [{
                    "thing": "EndInsideCastle",
                    "x": x,
                    "y": y
                }];
        };
        return LevelParsr;
    })();
    LevelParsr_1.LevelParsr = LevelParsr;
})(LevelParsr || (LevelParsr = {}));
