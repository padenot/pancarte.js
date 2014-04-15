/**
 * pancarte.js, dynamic overlay creation and playback on <video>
 */

/**
 * Global raphael canvas
 */
window.gr = null;

/**
 * From a set of points, get an SVG path.
 */
function path2string(path) {
  var str = "M";
  str += path[0].x + "," + path[0].y + "L";
  for(var i = 0; i < path.length; i++) {
    str += Math.floor(path[i].x) + "," + Math.floor(path[i].y) + " ";
  }
  str += "Z";
  return str;
}


/**
 * timecode: the javascript object that contains the point position for this
 *           instance.
 * video   : the video element on which paint the thing
 * callback: the thing to do on click
 * events  : a list of other callbacks to do at specific times, rather that on
 *           click.
 * colors  : an object that determines the stroke and the fill of the overlay,
 *           like so:
 *           { stroke: "rgba(0, 0, 0, 0.8)",
 *             fill: "rgba(255, 255, 255, 0.5)" }
 */
function PancartePlayer(timecode, video, callback, events, colors) {
  this.callback = callback;
  this.timecode = timecode;
  this.video = video;
  if (gr == null) {
    this.holder = putOverlayOnVideo(video);
    document.body.appendChild(this.holder);
    this.r = gr = Raphael(this.holder, this.holder.style.width, this.holder.style.height);
  } else {
    this.r = gr
  }
  var _this = this;
  this.lastPickedTime = -1;
  // sorted by time
  this.events = events || [];
  this.svgelement = null;
  this.colors = colors || { stroke: "rgba(0, 0, 0, 0.8)",
                            fill: "rgba(255, 255, 255, 0.5)" };


  var vrect = video.getBoundingClientRect()
  this.playerWidth = vrect.width;
  this.playerHeight = vrect.height;
  this.originalPlayerWidth = timecode["width"];
  this.originalPlayerHeight = timecode["height"];
  this.playerX = 0;
  this.playerY = 0;

  var _this = this;
  // This does not really work.
  window.addEventListener("resize", function() {
    _this.invalidate = true;
    var vrect = video.getBoundingClientRect();
    _this.playerWidth = vrect.width;
    _this.playerHeight = vrect.height;
    _this.playerX = vrect.top;
    _this.playerY = vrect.left;
    _this.r.setSize(_this.playerWidth, _this.playerHeight);
  });

  delete timecode.width;
  delete timecode.height;
}

PancartePlayer.prototype.tick = function() {
  if (this.video.paused) {
    return;
  }
  var prev = 0;

  // find the closest time
  for (var time in this.timecode) {
    if (this.video.currentTime < time) {
      break;
    }
    if (this.video.currentTime < prev && time.video.currentTime > time) {
      prev = time;
      break;
    }
    prev = time;
  }
  if (this.lastPickedTime != prev || this.invalidate) {
    this.invalidate = false;
    if (this.svgelement) {
      this.svgelement.remove();
    }
    var a = this.timecode[prev];
    var points = [];
    for (var i = 0; i < a.length; i++) {
      points.push({x: a[i].x, y:a[i].y});
    }
    var ratio = this.playerWidth / this.originalPlayerWidth;
    for (var i = 0; i < points.length; i++) {
      points[i].x = points[i].x * ratio + this.playerX;
      points[i].y = points[i].y * ratio + this.playerY;
    }
    this.display(points);
  }

  if (this.events.length > 0 && this.events[0].time < this.video.currentTime) {
    var e = this.events.shift();
    e.f();
  }

  this.lastPickedTime = prev;
  requestAnimationFrame(this.tick.bind(this));
}

PancartePlayer.prototype.play = function() {
  var _this = this;
  this.video.addEventListener("playing", function() {
    requestAnimationFrame(_this.tick.bind(_this));
  });
  this.video.play();
}

PancartePlayer.prototype.clear = function() {
  this.r.clear();
}

PancartePlayer.prototype.display = function(path) {
  var str = path2string(path);
  var _this = this;
  this.svgelement = this.r.path(str).attr(this.colors)
                  .click(function() {
                    _this.callback.bind(_this)();
                    _this.pause();
                  });
}

PancartePlayer.prototype.pause = function() {
  this.video.pause();
}


function putOverlayOnVideo(v) {
  var holder = document.createElement("div");
  holder.style.position = "absolute";
  var rect = v.getBoundingClientRect();

  // overlay
  holder.style.top = rect.top + "px";
  holder.style.left = rect.left + "px";
  holder.style.width = rect.width + "px";
  holder.style.height = rect.height + "px";

  return holder;
}

/**
 * outelement     : an <input> where we will put an object that contains all the
 *                  points after each frame. Or null if you plan to get it in
 *                  another way.
 * video          : a <video> element to record points.
 * videofps       : the number of fps of said video.
 * enableDragDrop : enable drawing squares by dragging and dropping the mouse.
 */
function PancarteRecorder(outelement, video, videofps, enableDragDrop, colors) {
  this.outelement = outelement;
  this.video = video;
  this.videoFps = videofps;
  this.startFrame();
  this.rect = video.getBoundingClientRect();
  this.holder = putOverlayOnVideo(video);
  this.colors = colors || { stroke: "rgba(0, 0, 0, 0.5)",
                            fill: "rgba(0, 0, 0, 0.3)" };

  var rect = video.getBoundingClientRect();
  this.videoWidth = rect.width;
  this.videoHeight = rect.height;

  this.points = { width: this.videoWidth, height: this.videoHeight };

  document.body.appendChild(this.holder);
  this.r = Raphael(this.holder, this.holder.style.width, this.holder.style.height);
  this.path = this.r.set();
  var _this = this;

  this.holder.addEventListener("click", function(e) {
    _this.addPoint(e.layerX, e.layerY);
  });

  if (enableDragDrop) {
    var dragstate = {
      down: {x: 0, y: 0},
      up: {x: 0, y: 0},
      dragging: false,
      moved: false
    };
    function quadFromOrigin(a, b) {
      return [
        {x: a.x, y: a.y},
        {x: b.x, y: a.y},
        {x: b.x, y: b.y},
        {x: a.x, y: b.y}
      ];
    }

    this.holder.addEventListener("mousedown", function(e) {
      dragstate.dragging = true;
      dragstate.down = {x: e.layerX, y: e.layerY};
    });

    this.holder.addEventListener("mouseup", function(e) {
      dragstate.dragging = false;
      if (!dragstate.moved) {
        return;
      }
      dragstate.up = {x: e.layerX, y: e.layerY};
      _this.addQuad(quadFromOrigin(dragstate.down, dragstate.up));
    });

    this.holder.addEventListener("mousemove", function(e) {
        if (!dragstate.dragging) {
          return;
        }
      dragstate.moved = true;
        _this.r.clear();
        var str = path2string(quadFromOrigin(dragstate.down, {x: e.layerX, y: e.layerY}));
        _this.r.path(str).attr(_this.colors);
    });
  }

  window.addEventListener("keypress", function(e) {
    // letter 'n' for next
    if (e.key == 'n' || e.keyCode == 110) {
      _this.nextFrame();
    }
  });
}

PancarteRecorder.prototype.nextFrame = function() {
  this.endFrame();
  this.video.currentTime += 1 / this.videoFps;
}

PancarteRecorder.prototype.resetCurrent = function() {
  this.points[this.currentTime] = [];
}

PancarteRecorder.prototype.startFrame = function() {
  console.log("startFrame");
}

PancarteRecorder.prototype.addPoint = function(x, y) {
  if (this.points[this.video.currentTime] == undefined) {
    this.points[this.video.currentTime] = [];
  }
  this.points[this.video.currentTime].push({x: x, y: y});
  if (this.points[this.video.currentTime].length > 2) {
    this.r.clear();
    var str = path2string(this.points[this.video.currentTime]);
    this.r.path(str).attr(this.colors);
  }
}

PancarteRecorder.prototype.addQuad = function(quad) {
  this.points[this.video.currentTime] = quad;
  var str = path2string(quad);
  this.r.clear();
  this.r.path(str).attr(this.colors);
  this.nextFrame();
}

PancarteRecorder.prototype.endFrame = function() {
  var path = this.points[this.video.currentTime];
  // keep the last point if no path has been added.
  if (!path) {
    this.points[this.video.currentTime] = this.points[this.video.currentTime - 1 / this.video.fps];
  }
  if (this.outelement) {
    this.outelement.value = JSON.stringify(this.points);
  }
}

PancarteRecorder.prototype.getPoints = function() {
  return this.points;
}

