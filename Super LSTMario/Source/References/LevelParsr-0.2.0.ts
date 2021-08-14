declare module LevelParsr {
    export interface ILevelParsr {
        parseRandom(creation: MapsCreatr.IPreThing[], FSM: FullScreenMario.IFullScreenMario);
        parseLSTMToLevel(data: Array<Array<number>>, FSM: FullScreenMario.IFullScreenMario);
    }
}

module LevelParsr {
    "use strict";

    export class LevelParsr implements ILevelParsr {


        RELEVANT_THINGS = ["Air", "Floor", "Block", "Brick", "Goomba", "Pipe", "Koopa", "Stone", "Flag", "CastleSmall", "Coin", "PipeHorizontal", "PipeVertical", "Piranha",
            "PlatformGeneratorUp", "PlatformGeneratorDown", "TreeTop", "TreeTrunk", "Platform", "PlatformTrack", "CastleLarge", "Water", "CastleBlock", "CastleBridge", "Bowser", "CastleAxe",
            "Springboard", "Coral", "Blooper", "CheepCheep", "BridgeBase", "Railing", "Podoboo", "HammerBro", "Lakitu", "Beetle", "ShroomTop", "ShroomTrunk", "Cannon", "PlantLarge",
            "Fence", "CastleWall", "Cloud1", "PlantSmall", "Cloud2"];

        RELEVANT_MACROS = ["Floor", "Pipe", "Fill", "Ceiling", "PlatformGenerator", "Tree", "Water", "StartInsideCastle",
            "EndInsideCastle", "EndOutsideCastle", "CastleSmall", "CastleLarge", "Scale", "Shroom", "Bridge"];

        CONTENTS = ["Mushroom", "Mushroom1Up", "Coin", "Star", "Vine", "HiddenCoin"];

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
            // "CheepsStart": macroCheepsStart,
            // "CheepsStop": macroCheepsStop,
            // "BulletBillsStart": macroBulletBillsStart,
            // "BulletBillsStop": macroBulletBillsStop,
            // "LakituStop": macroLakituStop,
            "StartInsideCastle": this.macroStartInsideCastle,
            "EndOutsideCastle": this._contentsEndOutsideCastle,
            "EndInsideCastle": this._contentsEndInsideCastle,
        }

        randCounter = 0;

        constructor() { }

        parseRandom(creation: any[], FSM: FullScreenMario.IFullScreenMario) {


            console.log(`Length prior to filtering: ${creation.length}`);
            creation = creation.filter(entry =>
                entry.reference.macro && this.RELEVANT_MACROS.indexOf(entry.reference.macro) !== -1 ||
                entry.thing && this.RELEVANT_THINGS.indexOf(entry.thing.title) !== -1);
            console.log(`Length after filtering: ${creation.length}`);

            let resultList = [];
            for (var entry of creation) {

                let ref = entry.reference;

                if (this.RELEVANT_MACROS.indexOf(ref.thing) !== -1) {
                    let result = this.macros[ref.thing](ref, FSM);

                    resultList.push(...result);
                }
                else {

                    if (ref.thing == "Platform" && ref.sliding) {
                        resultList.push(...this.macroSlidingPlatform(ref, FSM));
                    }
                    else resultList.push(ref);
                }
            }

            console.log(`Resulting list: ${resultList.length}`);

            // create grid array
            let lastXIndex = Math.max.apply(Math, resultList.map(function (o) { return o.x ? o.x : 0; }));

            let maxX = Math.ceil(lastXIndex / 8) + 1;
            let maxY = 28;

            let gridArray = this.createGridArray(maxX, maxY, 0);

            for (var item of resultList) {
                // if x or y are not given, pick 0 as default
                gridArray[Math.floor((item.x || 0) / 8)][Math.floor((item.y || 0) / 8)] = this.getThingID(item);
            }

            this.printParsed("Random", this.randCounter++, gridArray);
            // randCounter++;
        }

        parseLSTMToLevel(data: Array<Array<number>>, FSM: FullScreenMario.IFullScreenMario) {

            // Within the game engine, the levels are objects describing the world
            // as separate objects with coordinates and properties.

            // Basic level structure
            let levelObj = {
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
            let creation = levelObj["areas"][0].creation;

            // the array indices can be treated as coordinates/8
            // loop over all indices and parse every block
            for (let _x = 0; _x < data.length; _x++) {

                for (let _y = 0; _y < data[_x].length; _y++) {

                    // Filter out Air
                    if (data[_x][_y] != 0) creation.push(this.parseBack(_x * 8, _y * 8, data[_x][_y]));
                }
            }
            console.log(`Parsed ${data.length}`);

            return levelObj;
        }

        parseBack(_x: number, _y: number, _id: number): Object {

            // Set thing to CastleBlockFireBalls per default to save a condition
            let creationObj = {
                "thing": "CastleBlockFireBalls",
                "x": _x,
                "y": _y
            };

            // normal blocks -> just set thing to the appropriate IDThing
            if (_id < this.RELEVANT_THINGS.length) {

                // Exceptions: PlatformGenerator
                switch (_id) {
                    case this.RELEVANT_THINGS.indexOf["PlatformGeneratorDown"]:
                        creationObj["direction"] = -1;
                    case this.RELEVANT_THINGS.indexOf["PlatformGeneratorUp"]:

                        creationObj["macro"] = "PlatformGenerator";

                        // Remove ref to CastleBlockFireBalls
                        delete creationObj["thing"];
                        break;

                    default:
                        creationObj["thing"] = this.RELEVANT_THINGS[_id];
                        break;
                }
            }

            // Past relevant things come the blocks/bricks with content

            // Blocks
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length) {
                creationObj["thing"] = "Block";
                creationObj["contents"] = this.CONTENTS[_id - this.RELEVANT_THINGS.length];
            }

            // Bricks
            else if (_id < this.RELEVANT_THINGS.length + this.CONTENTS.length * 2) {
                creationObj["thing"] = "Brick";
                creationObj["contents"] = this.CONTENTS[_id - this.RELEVANT_THINGS.length - this.CONTENTS.length];
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

        // "Tree": FullScreenMario.FullScreenMario.prototype.macroTree,
        macroTree(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output: any[] = [
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
        // "Shroom": FullScreenMario.FullScreenMario.prototype.macroShroom,
        macroShroom(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, width = reference.width || 24, output: any[] = [
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
        // "Water": FullScreenMario.FullScreenMario.prototype.macroWater,
        macroWater(reference, FSM) {
            return [FSM.proliferate({
                "thing": "Water",
                "x": reference.x || 0,
                "y": (reference.y || 0) + 2,
                "height": "Infinity",
                "macro": undefined
            }, reference, true)];
        };
        // "Ceiling": FullScreenMario.FullScreenMario.prototype.macroCeiling,
        macroCeiling(reference, FSM) {
            return this.macros["Fill"]({
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
                "x": x + 16,
                "y": y + 20,
                "position": "end"
            }];
        }


        _coordsCastleLarge(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0;

            return [
                ...this.macros["CastleSmall"]({
                    "x": x + 16,
                    "y": y + 48
                }, FSM),
                {
                    "thing": "CastleLarge",
                    "x": x + 16,
                    "y": y,
                    "position": "end"
                }];
        }
        // "Bridge": FullScreenMario.FullScreenMario.prototype.macroBridge,
        macroBridge(reference, FSM) {
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

        _coordsScale(reference, FSM) {
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
        }

        _coordsPlatformGenerator(reference, FSM) {
            var direction = reference.direction || 1, x = reference.x || 0, width = reference.width || 24;
            return [{
                "thing": (direction == 1 ? "PlatformGeneratorUp" : "PlatformGeneratorDown"),
                "x": x + width / 2,
                "y": 0
            }]
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

            for (let _i = 0; _i < width; _i += 8) {
                output = {
                    "thing": "Platform",
                    "x": x + _i,
                    "y": y
                }

                outputs.push(output);
            }

            return outputs;
        }

        // "StartInsideCastle": FullScreenMario.FullScreenMario.prototype.macroStartInsideCastle,
        macroStartInsideCastle(reference, FSM) {
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
                output.push(...this.macros["Floor"]({
                    "x": x + 40,
                    "y": y + 24,
                    "width": width
                }, FSM));
            }
            return output;
        };

        _contentsEndOutsideCastle(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, collectionName = "EndOutsideCastle-" + [
                reference.x, reference.y, reference.large].join(",");

            let output = [
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
                    "y": y + 8,
                }];

            // for (var _y = y + 8; _y < y + 80; _y += 8)

            //     output.push({
            //         "thing": "FlagPole", "x": x, "y": _y,
            //         "collectionName": collectionName,
            //         "collectionKey": "FlagPole"
            //     });

            if (reference.large) {
                output.push(...this.macros["CastleLarge"]({
                    "x": x + (reference.castleDistance || 24),
                    "y": y,
                    "transport": reference.transport,
                    "walls": reference.walls || 8
                }, FSM));
            }
            else {
                output.push(...this.macros["CastleSmall"]({
                    "x": x + (reference.castleDistance || 32),
                    "y": y,
                    "transport": reference.transport
                }, FSM));
            }
            return output;
        }

        _contentsEndInsideCastle(reference, FSM) {
            var x = reference.x || 0, y = reference.y || 0, npc = reference.npc || "Toad";

            return [
                { "thing": "Stone", "x": x, "y": y + 88, "width": 256 },
                ...this.macros["Water"]({ "x": x, "y": y, "width": 104 }, FSM),
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
                { "thing": "CastleAxe", "x": x + 104, "y": y + 40 },
                // { "thing": "ScrollBlocker", "x": x + 112 },
                ...this.macros["Floor"]({ "x": x + 104, "y": y, "width": 152 }, FSM),
                {
                    "thing": "Stone", "x": x + 104, "y": y + 32,
                    "width": 24, "height": 32
                },
                {
                    "thing": "Stone", "x": x + 112, "y": y + 80,
                    "width": 16, "height": 24
                },
                // Peach's Magical Happy Chamber of Fantastic Love
                // { "thing": npc, "x": x + 200, "y": 13 }
            ];
        }

        // // "CheepsStart": FullScreenMario.FullScreenMario.prototype.macroCheepsStart,
        // macroCheepsStart(reference) {
        //     return {
        //         "thing": "DetectCollision",
        //         "x": reference.x || 0,
        //         "y": FSM.MapScreener.floor,
        //         "width": reference.width || 8,
        //         "height": FSM.MapScreener.height / FSM.unitsize,
        //         "activate": FSM.activateCheepsStart
        //     };
        // };

        // // "CheepsStop": FullScreenMario.FullScreenMario.prototype.macroCheepsStop,
        // macroCheepsStop(reference) {
        //     return {
        //         "thing": "DetectCollision",
        //         "x": reference.x || 0,
        //         "y": FSM.MapScreener.floor,
        //         "width": reference.width || 8,
        //         "height": FSM.MapScreener.height / FSM.unitsize,
        //         "activate": FSM.activateCheepsStop
        //     };
        // };
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
