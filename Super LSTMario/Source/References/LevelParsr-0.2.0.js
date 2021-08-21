var LevelParsr;
(function (LevelParsr_1) {
    "use strict";
    var LevelParsr = (function () {
        function LevelParsr() {
            this.RELEVANT_THINGS = ["Air", "Floor", "Block", "Brick", "Goomba", "Pipe", "Koopa", "Stone", "Flag", "CastleSmall", "Coin", "PipeHorizontal", "PipeVertical", "Piranha",
                "PlatformGeneratorUp", "PlatformGeneratorDown", "TreeTop", "TreeTrunk", "Platform", "PlatformTrack", "CastleLarge", "Water", "CastleBlock", "CastleBridge", "Bowser", "CastleAxe",
                "Springboard", "Coral", "Blooper", "CheepCheep", "BridgeBase", "Railing", "Podoboo", "HammerBro", "Lakitu", "Beetle", "ShroomTop", "ShroomTrunk", "Cannon", "PlantLarge",
                "Fence", "CastleWall", "Cloud1", "PlantSmall", "Cloud2"];
            this.RELEVANT_MACROS = ["Floor", "Pipe", "Fill", "Ceiling", "PlatformGenerator", "Tree", "Water", "StartInsideCastle",
                "EndInsideCastle", "EndOutsideCastle", "CastleSmall", "CastleLarge", "Scale", "Shroom", "Bridge"];
            this.CONTENTS = ["Mushroom", "Mushroom1Up", "Coin", "Star", "Vine", "HiddenCoin"];
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
        LevelParsr.prototype.parseRandom = function (creation, FSM) {
            var _this = this;
            console.log("Length prior to filtering: " + creation.length);
            creation = creation.filter(function (entry) {
                return entry.reference.macro && _this.RELEVANT_MACROS.indexOf(entry.reference.macro) !== -1 ||
                    entry.thing && _this.RELEVANT_THINGS.indexOf(entry.thing.title) !== -1;
            });
            console.log("Length after filtering: " + creation.length);
            var resultList = [];
            for (var _a = 0; _a < creation.length; _a++) {
                var entry = creation[_a];
                var ref = entry.reference;
                if (this.RELEVANT_MACROS.indexOf(ref.thing) !== -1) {
                    var result = this.macros[ref.thing](ref, FSM);
                    resultList.push.apply(resultList, result);
                }
                else {
                    if (ref.thing == "Platform" && ref.sliding) {
                        resultList.push.apply(resultList, this.macroSlidingPlatform(ref, FSM));
                    }
                    else
                        resultList.push(ref);
                }
            }
            console.log("Resulting list: " + resultList.length);
            // create grid array
            var lastXIndex = Math.max.apply(Math, resultList.map(function (o) { return o.x ? o.x : 0; }));
            var maxX = Math.ceil(lastXIndex / 8) + 1;
            var maxY = 28;
            var gridArray = this.createGridArray(maxX, maxY, 0);
            for (var _b = 0; _b < resultList.length; _b++) {
                var item = resultList[_b];
                // if x or y are not given, pick 0 as default
                gridArray[Math.floor((item.x || 0) / 8)][Math.floor((item.y || 0) / 8)] = this.getThingID(item);
            }
            this.printParsed("Random", this.randCounter++, gridArray);
            // randCounter++;
        };
        LevelParsr.prototype.parseLSTMToLevel = function (data, FSM) {
            // Within the game engine, the levels are objects describing the world
            // as separate objects with coordinates and properties.
            // Basic level structure
            var levelObj = {
                "name": "LSTMario",
                "locations": [
                    { "entry": "Plain" }
                ],
                "areas": [
                    {
                        "setting": "Overworld",
                        "creation": []
                    }
                ]
            };
            // levelObj["name"] = "LSTMario";
            // let levelArea: MapsCreatr.IMapsCreatrAreaRaw;
            // levelArea.creation = [];
            // levelObj["areas"][0] = levelArea;
            // let levelLocation: MapsCreatr.IMapsCreatrLocationRaw;
            // levelLocation.entry = "Plain";
            // levelObj["locations"][0] = levelLocation;
            // We now need to populate the creation array:
            var creation = levelObj["areas"][0].creation;
            // the array indices can be treated as coordinates/8
            // loop over all indices and parse every block
            for (var _x = 0; _x < data.length; _x++) {
                for (var _y = 0; _y < data[_x].length; _y++) {
                    // Filter out Air
                    if (data[_x][_y] != 0)
                        creation.push(this.parseBack(_x * 8, _y * 8, data[_x][_y]));
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
                // If macros contain idThing -> set macro instead of thing
                if (this.RELEVANT_MACROS.indexOf(idThing) != -1) {
                    creationObj["macro"] = idThing;
                    switch (idThing) {
                        case "Floor":
                            if (_y == 0)
                                creationObj["height"] = "Infinity";
                        case "Pipe":
                            creationObj["height"] = "Infinity";
                        case "Water":
                            creationObj["width"] = 16;
                            break;
                        case "PlatformGenerator":
                            if (_id == this.RELEVANT_THINGS.indexOf("PlatformGeneratorDown"))
                                creationObj["direction"] = -1;
                            break;
                        default:
                            break;
                    }
                }
                else if (idThing == "PlatformTrack") {
                    // { "thing": "Platform", "x": 688, "y": 40, "width": 24, "sliding": true, "begin": 660, "end": 720 },
                    creationObj["thing"] = "Platform";
                    creationObj["sliding"] = true;
                    creationObj["begin"] = Math.max(_x - 128, 0);
                    creationObj["end"] = _x + 128;
                }
                else
                    creationObj["thing"] = this.RELEVANT_THINGS[_id];
            }
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length) {
                creationObj["thing"] = "Block";
                creationObj["contents"] = this.CONTENTS[_id - this.RELEVANT_THINGS.length];
            }
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length * 2) {
                creationObj["thing"] = "Brick";
                creationObj["contents"] = this.CONTENTS[_id - this.RELEVANT_THINGS.length - this.CONTENTS.length];
            }
            else {
                // { "thing": "CastleBlock", "x": 160, "y": 46, "fireballs": 6, "hidden": true },
                creationObj["thing"] = "CastleBlock";
                creationObj["fireballs"] = 6;
                creationObj["hidden"] = true;
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
        // forceSaveData(location, area, data) {
        //     var fileName = `${location}-${area}.json`;
        //     var data = JSON.stringify(data);
        //     saveJSON(fileName, data, );
        // }
        // saveJSON (name, data) {
        //     var a = document.createElement("a");
        //     var url = window.URL.createObjectURL(new Blob([data], {type: "octlet/stream"}));
        //     a.href= url;
        //     a.download = name;
        //     a.style = "display: none";
        //     document.body.appendChild(a);
        //     a.click();
        //     window.URL.revokeObjectURL(url);
        //     a.remove();
        // }
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
        // listAllUniqueElements() {
        //     let _things = [];
        //     let _macros = [];
        //     for (var mapID in maps.library) {
        //         if (mapID == "Random") continue;
        //         for (var area of maps.library[mapID]["areas"]) {
        //             for (var reference of area["creation"]) {
        //                 if (reference.thing && !_things.includes(reference.thing)) _things.push(reference.thing);
        //                 if (reference.macro && !_macros.includes(reference.macro)) _macros.push(reference.macro);
        //             }
        //         }
        //     }
        //     console.log({ things: _things, macros: _macros });
        // }
        LevelParsr.prototype.listUniqueThings = function (creation) {
            var _things = [];
            var _macros = [];
            for (var _a = 0; _a < creation.length; _a++) {
                var reference = creation[_a];
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
            var x = reference.x || 0, y = reference.y || 0, height = reference.height || 16, pipe = FSM.proliferate({
                "thing": "Pipe",
                "x": x,
                "y": y,
                "width": 16,
                "height": reference.height === Infinity
                    ? "Infinity"
                    : reference.height || 8
            }, reference, true), output = [pipe];
            pipe.macro = undefined;
            if (height === "Infinity" || height === Infinity) {
                pipe.height = 99;
            }
            else {
                pipe.y += height;
            }
            if (reference.piranha) {
                output.push({
                    "thing": "Piranha",
                    "x": x + 4,
                    "y": pipe.y + 12,
                    "onPipe": true
                });
            }
            return output;
        };
        ;
        // "Tree": FullScreenMario.FullScreenMario.prototype.macroTree,
        LevelParsr.prototype.macroTree = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [
                {
                    "thing": "TreeTop",
                    "x": x,
                    "y": y,
                    "width": width
                }
            ];
            if (width > 16) {
                output.push({
                    "thing": "TreeTrunk",
                    "x": x + 8,
                    "y": y - 8,
                    "width": width - 16,
                    "height": "Infinity",
                    "groupType": reference.solidTrunk ? "Solid" : "Scenery"
                });
            }
            return output;
        };
        ;
        // "Shroom": FullScreenMario.FullScreenMario.prototype.macroShroom,
        LevelParsr.prototype.macroShroom = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [
                {
                    "thing": "ShroomTop",
                    "x": x,
                    "y": y,
                    "width": width
                }
            ];
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
            return [FSM.proliferate({
                    "thing": "Water",
                    "x": reference.x || 0,
                    "y": (reference.y || 0) + 2,
                    "height": "Infinity",
                    "macro": undefined
                }, reference, true)];
        };
        ;
        // "Ceiling": FullScreenMario.FullScreenMario.prototype.macroCeiling,
        LevelParsr.prototype.macroCeiling = function (reference, FSM) {
            return this.macros["Fill"]({
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
                    "x": x + 16,
                    "y": y + 20,
                    "position": "end"
                }];
        };
        LevelParsr.prototype._coordsCastleLarge = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            return this.macros["CastleSmall"]({
                "x": x + 16,
                "y": y + 48
            }, FSM).concat([
                {
                    "thing": "CastleLarge",
                    "x": x + 16,
                    "y": y,
                    "position": "end"
                }
            ]);
        };
        // "Bridge": FullScreenMario.FullScreenMario.prototype.macroBridge,
        LevelParsr.prototype.macroBridge = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = Math.max(reference.width || 0, 16), output = [];
            // A beginning column reduces the width and pushes it forward
            if (reference.begin) {
                width -= 8;
                output.push({
                    "thing": "Stone",
                    "x": x,
                    "y": y,
                    "height": "Infinity"
                });
                x += 8;
            }
            // An ending column just reduces the width 
            if (reference.end) {
                width -= 8;
                output.push({
                    "thing": "Stone",
                    "x": x + width,
                    "y": y,
                    "height": "Infinity"
                });
            }
            // Between any columns is a BridgeBase with a Railing on top
            output.push({ "thing": "BridgeBase", "x": x, "y": y, "width": width });
            output.push({ "thing": "Railing", "x": x, "y": y + 4, "width": width });
            return output;
        };
        ;
        LevelParsr.prototype._coordsScale = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, unitsize = 8, widthLeft = reference.widthLeft || 24, widthRight = reference.widthRight || 24, between = reference.between || 40, dropLeft = reference.dropLeft || 24, dropRight = reference.dropRight || 24, collectionName = "ScaleCollection--" + [
                x, y, widthLeft, widthRight, dropLeft, dropRight
            ].join(",");
            return [
                {
                    "thing": "Platform",
                    "x": x + between - (widthRight / 2),
                    "y": y - dropRight,
                    "width": widthRight,
                    "inScale": true,
                    "tension": (dropRight - 1.5) * unitsize,
                    // "onThingAdd": FSM.spawnScalePlatform,
                    "collectionName": collectionName,
                    "collectionKey": "platformRight"
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
            for (var _i = 0; _i < width; _i += 8) {
                output = {
                    "thing": "Platform",
                    "x": x + _i,
                    "y": y
                };
                outputs.push(output);
            }
            return outputs;
        };
        // "StartInsideCastle": FullScreenMario.FullScreenMario.prototype.macroStartInsideCastle,
        LevelParsr.prototype.macroStartInsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = (reference.width || 0) - 40, output = [
                {
                    "thing": "Stone",
                    "x": x,
                    "y": y + 48,
                    "width": 24,
                    "height": Infinity
                },
                {
                    "thing": "Stone",
                    "x": x + 24,
                    "y": y + 40,
                    "width": 8,
                    "height": Infinity
                },
                {
                    "thing": "Stone",
                    "x": x + 32,
                    "y": y + 32,
                    "width": 8,
                    "height": Infinity
                }];
            if (width > 0) {
                output.push.apply(output, this.macros["Floor"]({
                    "x": x + 40,
                    "y": y + 24,
                    "width": width
                }, FSM));
            }
            return output;
        };
        ;
        LevelParsr.prototype._contentsEndOutsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, collectionName = "EndOutsideCastle-" + [
                reference.x, reference.y, reference.large].join(",");
            var output = [
                // // Flag (scenery)
                // {
                //     "thing": "Flag", "x": x, "y": y + 80,
                //     "collectionName": collectionName,
                //     "collectionKey": "Flag"
                // },
                // {
                //     "thing": "FlagTop", "x": x, "y": y + 88,
                //     "collectionName": collectionName,
                //     "collectionKey": "FlagTop"
                // },
                // // Bottom stone
                {
                    "thing": "Flag",
                    "x": x,
                    "y": y + 8
                }];
            // for (var _y = y + 8; _y < y + 80; _y += 8)
            //     output.push({
            //         "thing": "FlagPole", "x": x, "y": _y,
            //         "collectionName": collectionName,
            //         "collectionKey": "FlagPole"
            //     });
            if (reference.large) {
                output.push.apply(output, this.macros["CastleLarge"]({
                    "x": x + (reference.castleDistance || 24),
                    "y": y,
                    "transport": reference.transport,
                    "walls": reference.walls || 8
                }, FSM));
            }
            else {
                output.push.apply(output, this.macros["CastleSmall"]({
                    "x": x + (reference.castleDistance || 32),
                    "y": y,
                    "transport": reference.transport
                }, FSM));
            }
            return output;
        };
        LevelParsr.prototype._contentsEndInsideCastle = function (reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad";
            return [
                { "thing": "Stone", "x": x, "y": y + 88, "width": 256 }
            ].concat(this.macros["Water"]({ "x": x, "y": y, "width": 104 }, FSM), [
                // Bridge & Bowser area
                { "thing": "CastleBridge", "x": x, "y": y + 24, "width": 104 },
                {
                    "thing": "Bowser", "x": x + 69, "y": y + 42,
                    "hard": reference.hard,
                    "spawnType": reference.spawnType || "Goomba",
                    "throwing": reference.throwing
                },
                { "thing": "CastleChain", "x": x + 96, "y": y + 32 },
                // Axe area
                { "thing": "CastleAxe", "x": x + 104, "y": y + 40 }
            ], this.macros["Floor"]({ "x": x + 104, "y": y, "width": 152 }, FSM), [
                {
                    "thing": "Stone", "x": x + 104, "y": y + 32,
                    "width": 24, "height": 32
                },
                {
                    "thing": "Stone", "x": x + 112, "y": y + 80,
                    "width": 16, "height": 24
                },
            ]);
        };
        return LevelParsr;
    })();
    LevelParsr_1.LevelParsr = LevelParsr;
})(LevelParsr || (LevelParsr = {}));
