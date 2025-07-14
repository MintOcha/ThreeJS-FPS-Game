var createScene = function () {
  var scene = new BABYLON.Scene(engine);
  scene.createDefaultCamera(true);

  // new node material for light animation
  var lightNodeMat = new BABYLON.NodeMaterial("lightNodeMat", scene, {
    emitComments: false,
  });

  // meshes and shaders to load
  var promises = [];
  promises.push(
    BABYLON.SceneLoader.AppendAsync(
      "https://models.babylonjs.com/Demos/nmeGlow/lightFixture.glb",
    ),
  );
  promises.push(
    lightNodeMat.loadAsync(
      "https://models.babylonjs.com/Demos/nmeGlow/lightGlowMat.json",
    ),
  );

  // load all and finish scene when assets loaded
  Promise.all(promises).then(function () {
    // create a camera pointing at your model.
    scene.createDefaultCameraOrLight(true, true, true);
    var camera = scene.getCameraByID("default camera");
    camera.beta = 1.4;
    camera.alpha = 1.2;

    // create default environment
    var helper = scene.createDefaultEnvironment();
    helper.setMainColor(BABYLON.Color3.Gray());

    // get light mesh, material, and textures
    var lightMesh = scene.getMeshByName("lightTube");
    var loadedTextures = lightMesh.material.getActiveTextures();
    var lightBaseColorTex;
    var lightEmissiveTex;

    for (var i = 0; i < loadedTextures.length; i++) {
      if (loadedTextures[i].name.includes("(Base Color)")) {
        lightBaseColorTex = loadedTextures[i];
      } else if (loadedTextures[i].name.includes("(Emissive)")) {
        lightEmissiveTex = loadedTextures[i];
      }
    }

    // build node material
    lightNodeMat.build(false);
    lightMesh.material = lightNodeMat;

    // assign original textures to node material
    var baseColor = lightNodeMat.getBlockByName("baseColorTexture");
    var emissiveColor = lightNodeMat.getBlockByName("emissiveTexture");

    baseColor.texture = lightBaseColorTex;
    emissiveColor.texture = lightEmissiveTex;

    // get shader values to drive glow
    var glowMask = lightNodeMat.getBlockByName("glowMask");
    var emissiveStrength = lightNodeMat.getBlockByName("emissiveStrength");

    // set up glow layer post effect
    var gl = new BABYLON.GlowLayer("glow", scene);
    gl.intensity = 1.25;

    // set up material to use glow layer
    gl.referenceMeshToUseItsOwnMaterial(lightMesh);

    // enable glow mask to render only emissive into glow layer, and then disable glow mask
    gl.onBeforeRenderMeshToEffect.add(() => {
      glowMask.value = 1.0;
    });
    gl.onAfterRenderMeshToEffect.add(() => {
      glowMask.value = 0.0;
    });

    // flicker animation
    var flickerAnim = new BABYLON.Animation(
      "flickerAnim",
      "value",
      60,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    var easingFunction = new BABYLON.SineEase();
    easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    var flickerKeys = [
      { frame: 0, value: 0.2 },
      { frame: 5, value: 0.8 },
      { frame: 10, value: 0.1 },
      { frame: 25, value: 0.8 },
      { frame: 30, value: 0.05 },
      { frame: 35, value: 0.7 },
      { frame: 40, value: 0.3 },
      { frame: 55, value: 0.5 },
      { frame: 70, value: 0.35 },
      { frame: 170, value: 1.0 },
    ];
    flickerAnim.setKeys(flickerKeys);
    flickerAnim.setEasingFunction(easingFunction);
    scene.beginDirectAnimation(
      emissiveStrength,
      [flickerAnim],
      0,
      flickerKeys[flickerKeys.length - 1].frame,
      true,
      1,
    );

    // show inspector
    scene.debugLayer.show({ embedMode: true });
    scene.debugLayer.select(lightNodeMat);
  });

  return scene;
};
