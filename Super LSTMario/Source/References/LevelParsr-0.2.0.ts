declare module LevelParsr {
    export interface ILevelParsr {
        parse(creation: MapsCreatr.IPreThing[], mapID: string, area: string, FSM: FullScreenMario.IFullScreenMario);
        parseOriginal(FSM: FullScreenMario.IFullScreenMario);
        parseLSTMToLevel(data: Array<Array<number>>, FSM: FullScreenMario.IFullScreenMario);
    }
}

module LevelParsr {
    "use strict";

    export class LevelParsr implements ILevelParsr {


        RELEVANT_THINGS = ["Air", "Floor", "Block", "Brick", "Goomba", "Pipe", "PipePiranha", "Koopa", "Stone", "CastleSmall", "Coin",
            "PlatformGeneratorUp", "PlatformGeneratorDown", "TreeTop", "TreeTrunk", "TreeTrunkSolid", "Platform", "PlatformFloating", "PlatformSliding", "PlatformFalling", "PlatformTrack", "Scale", "CastleLarge", "Water", "CastleBlock", "CastleBridge", "Bowser", "CastleAxe",
            "Springboard", "Blooper", "CheepCheep", "BridgeBase", "Railing", "Podoboo", "HammerBro", "Lakitu", "Beetle", "ShroomTop", "ShroomTrunk", "Cannon",
            "StartInsideCastle", "EndInsideCastle", "EndOutsideCastle", "CastleBlockFireBalls", "CheepsStart", "CheepsStop"];

        RELEVANT_MACROS = ["Floor", "Pipe", "Fill", "Ceiling", "PlatformGenerator", "Tree", "Water", "StartInsideCastle",
            "EndInsideCastle", "EndOutsideCastle", "CastleSmall", "CastleLarge", "Scale", "Shroom", "Bridge", "CheepsStart", "CheepsStop"];

        CONTENTS = ["Mushroom", "Mushroom1Up", "Coin", "Star", "Vine", "HiddenCoin"];

        ORDER = ["TreeTrunk", "TreeTrunkSolid", "TreeTop"];

        macros = {
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
            "CheepsStart": this.macroCheepsStart,
            "CheepsStop": this.macroCheepsStop,
            // "BulletBillsStart": macroBulletBillsStart,
            // "BulletBillsStop": macroBulletBillsStop,
            // "LakituStop": macroLakituStop,
            "StartInsideCastle": this.macroStartInsideCastle,
            "EndOutsideCastle": this._contentsEndOutsideCastle,
            "EndInsideCastle": this._contentsEndInsideCastle,
        }

        randCounter = 0;

        constructor() { }

        parseOriginal(FSM: FullScreenMario.IFullScreenMario) {

            let maps = FSM.settings.maps.library;
            for (var mapID in maps) {
                if (mapID == "Random") continue;

                let map = maps[mapID];
                for (var areaID in map.areas) {
                    let area = map.areas[areaID];
                    this.parse(area.creation, mapID, areaID, FSM);
                }

            }
        }

        parse(creation: any[], mapID: string, area: string, FSM: FullScreenMario.IFullScreenMario) {

            console.log(`Length prior to filtering: ${creation.length}`);
            if (mapID == "Random") {
                creation = creation.filter(entry =>
                    entry.reference.macro && this.RELEVANT_MACROS.indexOf(entry.reference.macro) !== -1 ||
                    entry.thing && this.RELEVANT_THINGS.indexOf(entry.thing.title) !== -1);
            }
            else {
                creation = creation.filter(entry =>
                    entry.macro && this.RELEVANT_MACROS.indexOf(entry.macro) !== -1 ||
                    entry.thing && this.RELEVANT_THINGS.indexOf(entry.thing) !== -1);
            }
            console.log(`Length after filtering: ${creation.length}`);

            // creation.forEach(entry => console.log(entry));
            // console.log("------------------------------------");

            let resultList = [];
            for (var entry of creation) {

                if (mapID == "Random") entry = entry.reference;

                // console.log(entry);
                let macro = mapID == "Random" ? entry.thing : entry.macro;

                if (this.RELEVANT_MACROS.indexOf(macro) !== -1) {
                    let result = this.macros[macro](entry, FSM);

                    resultList.push(...result);
                }
                else {

                    if (entry.thing == "BridgeBase") {
                        resultList.push(...this.macroBridgeBase(entry, FSM));
                    }
                    else if(entry.thing == "Railing") {
                        resultList.push(...this.macroBridgeRailing(entry, FSM));
                    }
                    else if (entry.thing == "Platform" && entry.sliding) {
                        resultList.push(...this.macroSlidingPlatform(entry, FSM));
                    }
                    else if (entry.thing == "Platform" && entry.floating) {
                        resultList.push(...this.macroFloatingPlatform(entry, FSM));
                    }
                    else if (entry.thing == "Platform" && entry.falling) {
                        resultList.push({ "thing": "PlatformFalling", "x": entry.x, "y": entry.y });
                    }
                    else if (entry.thing == "Stone" && (entry.height || entry.width)) {
                        resultList.push(...this.macroStonePillar(entry, FSM));
                    }
                    else if (entry.thing == "CastleBlock" && entry.fireballs) {
                        resultList.push({ "thing": "CastleBlockFireBalls", "x": entry.x, "y": entry.y });
                    }
                    else resultList.push(entry);
                }
            }

            console.log(`Resulting list: ${resultList.length}`);

            // create grid array
            let lastXIndex = Math.max.apply(Math, resultList.map(function (o) { return o.x ? o.x : 0; }));

            let maxX = Math.ceil(lastXIndex / 8) + 1;
            let maxY = 14;

            let gridArray = this.createGridArray(maxX, maxY, 0);

            for (var item of resultList) {
                // if x or y are not given, pick 0 as default
                if (gridArray[Math.ceil((item.x || 0) / 8)][Math.ceil((item.y || 0) / 8)] != this.getThingID({ "thing": "TreeTop" }))
                    gridArray[Math.ceil((item.x || 0) / 8)][Math.ceil((item.y || 0) / 8)] = this.getThingID(item);
            }

            this.printParsed(mapID, mapID == "Random" ? this.randCounter++ : area, gridArray);
            // randCounter++;
        }

        parseLSTMToLevel(data: Array<Array<number>>, FSM: FullScreenMario.IFullScreenMario) {

            // Within the game engine, the levels are objects describing the world
            // as separate objects with coordinates and properties.

            // Basic level structure
            let levelObj = {
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
            let creation = levelObj["areas"][0].creation;

            // the array indices can be treated as coordinates/8
            // loop over all indices and parse every block
            for (let _x = 0; _x < data.length; _x++) {

                for (let _y = 0; _y < data[_x].length; _y++) {

                    // Filter out Air
                    if (data[_x][_y] != 0) {
                        let result = this.parseBack(_x * 8, _y * 8, data[_x][_y]);

                        if (result) creation.push(result);
                    }
                }
            }
            console.log(`Parsed ${data.length}`);

            return levelObj;
        }

        parseBack(_x: number, _y: number, _id: number): Object | Object[] {

            let creationObj = {
                "x": _x,
                "y": _y
            };

            // normal blocks -> just set thing to the appropriate IDThing
            if (_id < this.RELEVANT_THINGS.length) {

                // For simplicity, some macros were turned into Things for the IDs, so we have to convert them back

                // Hacky stuff wooooooooo
                let idThing = this.getIDThing(_id);
                if (idThing == "PlatformGeneratorUp" || idThing == "PlatformGeneratorDown") idThing = "PlatformGenerator";
                else if (idThing == "PipePiranha") {
                    idThing = "Pipe";
                    creationObj["piranha"] = true;
                }

                // PlatformTrack is used to describe the platform's movement, it's not used when parsing back
                if (idThing == "PlatformTrack") return;

                // If macros contain idThing -> set macro instead of thing
                if (this.RELEVANT_MACROS.indexOf(idThing) != -1) {

                    creationObj["macro"] = idThing;

                    switch (idThing) {

                        case "Floor":
                            if (_y == 0) creationObj["height"] = "Infinity";
                            break;

                        case "Pipe":
                            creationObj["height"] = "Infinity";
                        case "Water":
                            creationObj["width"] = 16;
                            break;

                        case "PlatformGenerator":
                            if (_id == this.RELEVANT_THINGS.indexOf("PlatformGeneratorDown")) creationObj["direction"] = -1;
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


                else creationObj["thing"] = this.RELEVANT_THINGS[_id];
            }

            // Past relevant things come the blocks/bricks with content

            // Blocks
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length) {
                creationObj["thing"] = "Block";

                let content = this.CONTENTS[_id - this.RELEVANT_THINGS.length];

                if (content == "HiddenCoin") {
                    creationObj["contents"] = "Coin";
                    creationObj["hidden"] = true;
                }
                else creationObj["contents"] = content;
            }

            // Bricks
            else {
                creationObj["thing"] = "Brick";

                let content = this.CONTENTS[_id - this.RELEVANT_THINGS.length - this.CONTENTS.length];

                if (content == "HiddenCoin") {
                    creationObj["contents"] = "Coin";
                    creationObj["hidden"] = true;
                }
                else creationObj["contents"] = content;
            }

            return creationObj;
        }

        //#region Utility

        printParsed(location, area, arr) {
            var textFile = null;


            var text = JSON.stringify(arr);
            var data = new Blob([text], { type: 'octet/stream' });

            // If we are replacing a previously generated file we need to
            // manually revoke the object URL to avoid memory leaks.
            if (textFile !== null) {
                window.URL.revokeObjectURL(textFile);
            }

            textFile = window.URL.createObjectURL(data);

            let p = document.createElement("p");
            let a = document.createElement("a");

            a.innerText = `${location}-${area}`;
            a.setAttribute('href', textFile);
            a.setAttribute('download', `${location}-${area}.json`);

            p.appendChild(a);

            document.body.appendChild(p);
            // returns a URL you can use as a href
            // if (location == "Random")
            //     document.append(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
            // else
            //     document.append(`<p><a href="${textFile}" download="${location}-${area}.json">${location}</a></p>`);
        }

        getThingID(entry) {
            switch (entry.thing) {

                case 'Block':
                    // The X entries after relevant things is reserved for the different block types
                    if (entry.contents) return this.RELEVANT_THINGS.length + this.CONTENTS.indexOf(entry.hidden ? "HiddenCoin" : entry.contents);

                case 'Brick':
                    // The X entries after that are reserved for the different BRICK types
                    if (entry.contents) return this.RELEVANT_THINGS.length + this.CONTENTS.length + this.CONTENTS.indexOf(entry.contents);

                default:
                    return this.RELEVANT_THINGS.indexOf(entry.thing);
            }
        }

        getIDThing(id) {

            if (id < this.RELEVANT_THINGS.length) return this.RELEVANT_THINGS[id];
            if (id < this.RELEVANT_THINGS.length + this.CONTENTS.length) return "Block" + this.CONTENTS[id - this.RELEVANT_THINGS.length];

            return "Brick" + this.CONTENTS[id - this.RELEVANT_THINGS.length - this.CONTENTS.length];
        }

        createGridArray(x, y, fill): Array<any> {

            let gridArray = new Array<number[]>(x);

            for (let _x = 0; _x < gridArray.length; _x++) {

                gridArray[_x] = new Array<any>(y);

                for (let _y = 0; _y < y; _y++) gridArray[_x][_y] = fill;
            }

            return gridArray;
        }

        printArray(arr: Array<any>) {

            let resultArr = this.createGridArray(arr[0].length, arr.length, "");

            for (let x = 0; x < arr.length; x++) {

                for (let y = 0; y < arr[x].length; y++) {
                    resultArr[arr[x].length - y - 1][x] = this.getIDThing(arr[x][y]);
                }
            }

            console.log(resultArr);
        }

        listUniqueThings(creation) {
            let _things = [];
            let _macros = [];

            for (var reference of creation) {
                if (reference.thing && _things.indexOf(reference.thing) === -1) _things.push(reference.thing);
                if (reference.macro && _macros.indexOf(reference.macro) === -1) _macros.push(reference.macro);
            }

            console.log({ things: _things, macros: _macros });
        }
        //#endregion

        //#region Macros
        // "Fill": FullScreenMario.FullScreenMario.prototype.macroFillPreThings,
        macroFillPreThings(reference, FSM) {

            if (reference.thing == "CastleBlock" && reference.fireballs) reference.thing = "CastleBlockFireBalls";

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
        }

        // "Floor": FullScreenMario.FullScreenMario.prototype.macroFloor,
        macroFloor(reference, FSM) {

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
        // "Pipe": FullScreenMario.FullScreenMario.prototype.macroPipe,
        macroPipe(reference, FSM) {
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

            if (height === "Infinity" || height === Infinity) output.height = 99;
            else output.y += height;

            return [output];
        };

        // "Tree": FullScreenMario.FullScreenMario.prototype.macroTree,
        macroTree(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, outputs = [];

            for (let _x = x; _x < x + width; _x += 8) {
                outputs.push(
                    {
                        "thing": "TreeTop",
                        "x": _x,
                        "y": y
                    });
            }

            for (let _trunkX = x + 8; _trunkX < x + width - 8; _trunkX += 8) {
                for (let _trunkY = y - 8; _trunkY >= 0; _trunkY -= 8) {
                    outputs.push({
                        "thing": (reference.solidTrunk ? "TreeTrunkSolid" : "TreeTrunk"),
                        "x": _trunkX,
                        "y": _trunkY
                    });
                }
            }

            return outputs;
        };
        // "Shroom": FullScreenMario.FullScreenMario.prototype.macroShroom,
        macroShroom(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output = [];

            for (let _x = x; _x < x + width; _x += 8) {
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
        // "Water": FullScreenMario.FullScreenMario.prototype.macroWater,
        macroWater(reference, FSM) {
            var y = reference.y || 0, startX = reference.x || 0, width = reference.width || 16, endX = startX + width, output = [];

            for (let _x = startX; _x < endX; _x += 8) {
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

        // "Ceiling": FullScreenMario.FullScreenMario.prototype.macroCeiling,
        macroCeiling(reference, FSM) {
            return FSM.LevelParser.macros["Fill"]({
                "thing": "Brick",
                "x": reference.x,
                "y": 88,
                "xnum": (reference.width / 8) | 0,
                "xwidth": 8
            }, FSM);
        };

        _coordsCastleSmall(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;

            return [{
                "thing": "CastleSmall",
                "x": x,
                "y": y + 8
            }];
        }


        _coordsCastleLarge(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;

            return [
                ...FSM.LevelParser.macros["CastleSmall"]({
                    "x": x + 16,
                    "y": y + 48
                }, FSM),
                {
                    "thing": "CastleLarge",
                    "x": x + 16,
                    "y": y + 8,
                    "position": "end"
                }];
        }
        // "Bridge": FullScreenMario.FullScreenMario.prototype.macroBridge,
        macroBridge(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = Math.max(reference.width || 0, 16), output = [];
            // Between any columns is a BridgeBase with a Railing on top

            // A beginning column reduces the width and pushes it forward
            if (reference.begin) {
                width -= 8;

                for (let _y = y; _y >= 0; _y -= 8) {
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

                for (let _y = y; _y >= 0; _y -= 8) {
                    output.push({
                        "thing": "Stone",
                        "x": x + width,
                        "y": _y,
                        "height": "Infinity"
                    });
                }
            }

            for (let _x = x; _x < x + width; _x += 8) {
                output.push({ "thing": "BridgeBase", "x": _x, "y": y });
                output.push({ "thing": "Railing", "x": _x, "y": y + 8 });
            }
            
            return output;
        };

        _coordsScale(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;
            return [
                {
                    "thing": "Scale",
                    "x": x,
                    "y": y
                }];
        }

        _coordsPlatformGenerator(reference, FSM) {
            var direction = reference.direction || 1, x = reference.x || 0, width = reference.width || 24;
            return [{
                "thing": (direction == 1 ? "PlatformGeneratorUp" : "PlatformGeneratorDown"),
                "x": x + width / 2,
                "y": 0
            }]
        }

        macroBridgeBase(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 8, outputs = [];

            for (let _x = x; _x < x + width; _x += 8) {
                outputs.push({
                    "thing": "BridgeBase",
                    "x": _x,
                    "y": y
                });
            }

            return outputs;
        }

        macroBridgeRailing(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 8, outputs = [];

            for (let _x = x; _x < x + width; _x += 8) {
                outputs.push({
                    "thing": "Railing",
                    "x": _x,
                    "y": y
                });
            }

            return outputs;
        }

        macroSlidingPlatform(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 16, begin = reference.begin, end = reference.end, outputs = [], output;

            for (let _x = begin; _x < end; _x += 8) {
                output = {
                    "thing": "PlatformTrack",
                    "x": _x,
                    "y": y
                }

                outputs.push(output);
            }

            outputs.push(output = {
                "thing": "PlatformSliding",
                "x": x,
                "y": y
            });

            return outputs;
        }

        macroFloatingPlatform(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 16, begin = reference.begin, end = reference.end, outputs = [], output;

            for (let _y = begin; _y < end; _y += 8) {
                output = {
                    "thing": "PlatformTrack",
                    "x": x,
                    "y": _y
                }

                outputs.push(output);
            }

            outputs.push({
                "thing": "PlatformFloating",
                "x": x,
                "y": y
            });

            return outputs;
        }

        macroStonePillar(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, startY = reference.height == "Infinity" ? 0 : y - (reference.height || 0), width = reference.width || 8, outputs = [];

            for (let _x = x; _x < x + width; _x += 8) {
                for (let _y = startY; _y <= y; _y += 8) {
                    outputs.push({
                        "thing": "Stone",
                        "x": _x,
                        "y": _y
                    })
                }
            }

            return outputs;
        }

        // "StartInsideCastle": FullScreenMario.FullScreenMario.prototype.macroStartInsideCastle,
        macroStartInsideCastle(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = (reference.width || 0) - 40;

            let output = [{
                "thing": "StartInsideCastle",
                "x": x,
                "y": y
            }];

            if (width > 0) {
                output.push(...FSM.LevelParser.macros["Floor"]({
                    "macro": "Floor",
                    "x": x + 40,
                    "y": y + 24,
                    "width": width
                }, FSM));
            }

            return output;
        };

        _contentsEndOutsideCastle(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;

            let output = [{
                "thing": "EndOutsideCastle",
                "x": x,
                "y": y + 8,
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
        }

        _contentsEndInsideCastle(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad";

            return [{
                "thing": "EndInsideCastle",
                "x": x,
                "y": y
            }]
        }

        // "CheepsStart": FullScreenMario.FullScreenMario.prototype.macroCheepsStart,
        macroCheepsStart(reference, FSM) {
            return [{
                "thing": "CheepsStart",
                "x": reference.x || 0,
                "y": FSM.MapScreener.floor,
            }];
        };

        // "CheepsStop": FullScreenMario.FullScreenMario.prototype.macroCheepsStop,
        macroCheepsStop(reference, FSM) {
            return [{
                "thing": "CheepsStop",
                "x": reference.x || 0,
                "y": FSM.MapScreener.floor
            }];
        };
        
        // // "BulletBillsStart": FullScreenMario.FullScreenMario.prototype.macroBulletBillsStart,
        // macroBulletBillsStart(reference) {
        //     return {
        //         "thing": "DetectCollision",
        //         "x": reference.x || 0,
        //         "y": FSM.MapScreener.floor,
        //         "width": reference.width || 8,
        //         "height": FSM.MapScreener.height / FSM.unitsize,
        //         "activate": FSM.activateBulletBillsStart
        //     };
        // };
        // // "BulletBillsStop": FullScreenMario.FullScreenMario.prototype.macroBulletBillsStop,
        // macroBulletBillsStop(reference) {
        //     return {
        //         "thing": "DetectCollision",
        //         "x": reference.x || 0,
        //         "y": FSM.MapScreener.floor,
        //         "width": reference.width || 8,
        //         "height": FSM.MapScreener.height / FSM.unitsize,
        //         "activate": FSM.activateBulletBillsStop
        //     };
        // };
        // // "LakituStop": FullScreenMario.FullScreenMario.prototype.macroLakituStop,
        // macroLakituStop(reference) {
        //     return {
        //         "thing": "DetectCollision",
        //         "x": reference.x || 0,
        //         "y": FSM.MapScreener.floor,
        //         "width": reference.width || 8,
        //         "height": FSM.MapScreener.height / FSM.unitsize,
        //         "activate": FSM.activateLakituStop
        //     };
        // };
        //#endregion


    }


}
