pancarte.js
===========

Dynamic clickable overlays on HTML5 video.

## Examples

### Recording

```javascript
// #points is an <input> in the page
// #video is the <video> in the page
var r = new PancarteRecorder(document.querySelector("#points"),
                             document.querySelector("#video"),
                             25, false,
                             { stroke: "rgba(0, 0, 0, 0.5)",
                              fill: "rgba(0, 0, 0, 0.3)" });
```

Then, click to make a polygon, and when you're done, press the `n` letter on the
keyboard. It goes to the next frame. If the object does not move, you can press
`n` and it will keep the frame.

If the fourth argument is `true`, you can draw rectangles by clicking and
dragging the mouse.

When you're done, copy paste the `<input>`, or call the `getPoints` method and
shove those points somewhere.

### Playing back the recording

```javascript
// timecode is the points we got during the recording
// video is the video
var events = {
  {
    time: 4.0,
    f: function() {
      alert("We are at 4.0 in the video, and this fires.");
    }
  }, {
    time: 8.0,
    f: function() {
      alert("We are at 8.0 in the video, and this fires.");
    }
  },
};
var p = new PancartePlayer(timecode, video, function() {
                                              alert("ALLO.");
                                            }, events, {
                                            stroke: "rgba(0, 0, 0, 0.5)",
                                            fill: "rgba(255, 255, 255, 0.3)" });
p.play();
```

## License
MPL 2.0


