// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let startButton;
let switchButton;
let currentFacingMode = "user";

// 泡泡相關變數
let bubbleX, bubbleY;
let bubbleSize = 100;
let isNewBubbleRequired = true;

function preload() {
  // 關閉預設鏡像，改由程式碼手動控制，以適應前後鏡頭切換
  handPose = ml5.handPose({ flipped: false });
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('sans-serif'); // 確保浮水印字體清晰

  // 監聽視窗縮放
  window.onresize = function() {
    resizeCanvas(windowWidth, windowHeight);
  };

  // 建立開始偵測按鈕
  startButton = createButton('開始偵測 / Start Detection');
  startButton.position(width / 2 - 75, height / 2 - 25);
  startButton.size(150, 60);
  startButton.style('font-size', '16px');
  startButton.mousePressed(startModel);

  // 建立切換鏡頭按鈕（初始隱藏）
  switchButton = createButton('切換鏡頭 / Switch Camera');
  switchButton.position(20, 20);
  switchButton.mousePressed(toggleCamera);
  switchButton.hide();

  // 初始化第一顆泡泡
  spawnBubble();
}

function initCamera() {
  if (video) {
    video.remove(); // 移除舊的影片元件以釋放資源
  }

  // 設定攝影機參數，明確指定使用前鏡頭 (user) 並處理鏡像
  let constraints = {
    video: {
      facingMode: currentFacingMode
    },
    audio: false
  };

  video = createCapture(constraints);
  video.size(640, 480);
  video.hide();
  video.elt.setAttribute('playsinline', '');
}

function toggleCamera() {
  // 切換模式
  currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
  
  // 重新初始化攝影機
  initCamera();

  // 確保影片加載完成後再啟動偵測，避免失效
  video.elt.onloadedmetadata = () => {
    handPose.detectStart(video, gotHands);
  };
}

function startModel() {
  initCamera();
  handPose.detectStart(video, gotHands);
  startButton.hide();
  switchButton.show(); // 啟動後顯示切換按鈕
}

function spawnBubble() {
  // 在畫面範圍內隨機產生位置（保留邊距避免泡泡太貼邊）
  let margin = 100;
  bubbleX = random(margin, width - margin);
  bubbleY = random(margin, height - margin);
}

function draw() {
  background(20); // 夜間模式背景 (深灰色)

  if (!video) return;

  // 依據鏡頭實際給出的畫面尺寸實時計算比例 (不強制使用 640x480)
  let vW = video.elt.videoWidth || 640;
  let vH = video.elt.videoHeight || 480;
  let videoAspect = vW / vH;
  let canvasAspect = width / height;
  let renderW, renderH, offsetX, offsetY;

  if (canvasAspect > videoAspect) {
    renderH = height;
    renderW = height * videoAspect;
  } else {
    renderW = width;
    renderH = width / videoAspect;
  }
  offsetX = (width - renderW) / 2;
  offsetY = (height - renderH) / 2;

  // 處理鏡像繪製：如果是前鏡頭，水平反轉畫面
  push();
  if (currentFacingMode === "user") {
    translate(offsetX + renderW, offsetY);
    scale(-1, 1);
    image(video, 0, 0, renderW, renderH);
  } else {
    image(video, offsetX, offsetY, renderW, renderH);
  }
  pop();

  // 繪製半透明泡泡
  noStroke();
  fill(0, 200, 255, 100); // 半透明天藍色
  circle(bubbleX, bubbleY, bubbleSize);
  fill(255, 255, 255, 150);
  circle(bubbleX - bubbleSize * 0.2, bubbleY - bubbleSize * 0.2, bubbleSize * 0.2); // 泡泡反光效果

  // 繪製浮水印 (畫面中間)
  fill(255, 255, 255, 80); // 半透明白色
  textAlign(CENTER, CENTER);
  textSize(max(width, height) * 0.04); // 根據螢幕大小動態調整字級
  text("414730647 蘇宥睿", width / 2, height / 2);

  // Ensure at least one hand is detected
  if (hands.length > 0) {
    let displayScale = renderW / vW;

    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // 處理座標轉換與鏡像邏輯
        let processX = (kx) => {
          // 如果是前鏡頭，座標也需要鏡像翻轉才能對準翻轉後的畫面
          let nx = currentFacingMode === "user" ? vW - kx : kx;
          return offsetX + nx * displayScale;
        };
        let processY = (ky) => offsetY + ky * displayScale;

        let thumb = hand.keypoints[4];
        let index = hand.keypoints[8];

        let thumbX = processX(thumb.x);
        let thumbY = processY(thumb.y);
        let indexX = processX(index.x);
        let indexY = processY(index.y);

        // 計算捏合距離與是否在泡泡內
        let pinchDist = dist(thumbX, thumbY, indexX, indexY);
        let distToBubble = dist((thumbX + indexX) / 2, (thumbY + indexY) / 2, bubbleX, bubbleY);

        // 如果捏合（距離小於40）且位置在泡泡範圍內
        if (pinchDist < 40 && distToBubble < bubbleSize / 2) {
          spawnBubble();
        }

        let clr = hand.handedness == "Left" ? color(255, 0, 255) : color(255, 255, 0);
        
        stroke(clr);
        strokeWeight(3);
        drawSkeleton(hand, processX, processY);

        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];
          noStroke();
          fill(clr);
          circle(processX(keypoint.x), processY(keypoint.y), 12);
        }
      }
    }
  }
}

// 輔助函式：繪製手部骨架連線
function drawSkeleton(hand, px, py) {
  // 定義手指關鍵點的索引順序
  let fingerIndices = [
    [0, 1, 2, 3, 4],     // 大拇指
    [0, 5, 6, 7, 8],     // 食指
    [0, 9, 10, 11, 12],  // 中指
    [0, 13, 14, 15, 16], // 無名指
    [0, 17, 18, 19, 20]  // 小拇指
  ];

  for (let finger of fingerIndices) {
    for (let i = 0; i < finger.length - 1; i++) {
      let p1 = hand.keypoints[finger[i]];
      let p2 = hand.keypoints[finger[i + 1]];
      line(px(p1.x), py(p1.y), px(p2.x), py(p2.y));
    }
  }
}
