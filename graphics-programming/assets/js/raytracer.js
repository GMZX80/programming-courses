(function () {
  "use strict";

  var lab = document.querySelector("[data-ray-lab]");
  if (!lab) {
    return;
  }

  var stage = Number(lab.getAttribute("data-stage"));
  var imageCanvas = lab.querySelector("[data-ray-canvas]");
  var diagramCanvas = lab.querySelector("[data-diagram-canvas]");
  var controlsRoot = lab.querySelector("[data-ray-controls]");
  var renderButton = lab.querySelector("[data-render-button]");
  var resetButton = lab.querySelector("[data-reset-button]");
  var renderState = lab.querySelector("[data-render-state]");
  var diagramLabel = lab.querySelector("[data-diagram-label]");
  var proofNote = lab.querySelector("[data-proof-note]");
  var pixelCoordinate = lab.querySelector("[data-pixel-coordinate]");
  var pixelNumber = lab.querySelector("[data-pixel-number]");
  var pixelRange = lab.querySelector("[data-pixel-range]");
  var pixelValues = lab.querySelector("[data-pixel-values]");
  var pixelFormula = lab.querySelector("[data-pixel-formula]");
  var vectorRaw = lab.querySelector("[data-vector-raw]");
  var vectorLength = lab.querySelector("[data-vector-length]");
  var vectorUnit = lab.querySelector("[data-vector-unit]");
  var rayPosition = lab.querySelector("[data-ray-position]");
  var vectorFormula = lab.querySelector("[data-vector-formula]");
  var positionFormula = lab.querySelector("[data-position-formula]");

  var EPSILON = 0.001;
  var FAR = 1000000;

  function v(x, y, z) { return [x, y, z]; }
  function add(a, b) { return v(a[0] + b[0], a[1] + b[1], a[2] + b[2]); }
  function sub(a, b) { return v(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  function mul(a, value) { return v(a[0] * value, a[1] * value, a[2] * value); }
  function hadamard(a, b) { return v(a[0] * b[0], a[1] * b[1], a[2] * b[2]); }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return v(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);
  }
  function length(a) { return Math.sqrt(dot(a, a)); }
  function normalise(a) {
    var magnitude = length(a);
    return magnitude > 0 ? mul(a, 1 / magnitude) : v(0, 0, 0);
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function reflect(direction, normal) { return sub(direction, mul(normal, 2 * dot(direction, normal))); }
  function refract(direction, normal, eta) {
    var cosTheta = Math.min(dot(mul(direction, -1), normal), 1);
    var perpendicular = mul(add(direction, mul(normal, cosTheta)), eta);
    var parallel = mul(normal, -Math.sqrt(Math.abs(1 - dot(perpendicular, perpendicular))));
    return add(perpendicular, parallel);
  }
  function mix(a, b, amount) { return add(mul(a, 1 - amount), mul(b, amount)); }
  function colourClamp(colour) { return v(clamp(colour[0], 0, 1), clamp(colour[1], 0, 1), clamp(colour[2], 0, 1)); }

  var CONTROL_DEFINITIONS = {
    1: [
      { key: "pixelX", label: "Column", type: "range", min: 0, max: 15, step: 1, value: 9, suffix: " of 15" },
      { key: "pixelY", label: "Row", type: "range", min: 0, max: 9, step: 1, value: 4, suffix: " of 9" }
    ],
    2: [
      { key: "rawX", label: "Raw direction X", type: "range", min: 1, max: 4, step: 0.5, value: 3 },
      { key: "rawY", label: "Raw direction Y", type: "range", min: -3, max: 3, step: 0.5, value: 2 },
      { key: "rayT", label: "Ray parameter t", type: "range", min: 0, max: 3, step: 0.5, value: 2 }
    ],
    3: [
      { key: "fov", label: "Vertical field of view", type: "range", min: 25, max: 100, step: 1, value: 52, suffix: "°" },
      { key: "cameraPixelX", label: "Pixel column", type: "range", min: 0, max: 15, step: 1, value: 12, suffix: " of 15" },
      { key: "cameraPixelY", label: "Pixel row", type: "range", min: 0, max: 9, step: 1, value: 2, suffix: " of 9" }
    ],
    4: [
      { key: "sphereX", label: "Sphere offset from centre ray", type: "range", min: -1.4, max: 1.4, step: 0.1, value: 0 }
    ],
    5: [
      { key: "frontZ", label: "Blue sphere Z", type: "range", min: -3.8, max: -2.1, step: 0.1, value: -2.6 }
    ],
    6: [
      { key: "view", label: "Hit-record view", type: "select", value: "normal", options: [["normal", "Surface normal"], ["albedo", "Material albedo"]] }
    ],
    7: [
      { key: "lightX", label: "Light position X", type: "range", min: -5, max: 5, step: 0.25, value: -2.5 },
      { key: "shininess", label: "Specular exponent", type: "range", min: 4, max: 96, step: 4, value: 32 }
    ],
    8: [
      { key: "bias", label: "Secondary-ray origin", type: "select", value: "on", options: [["on", "Biased from surface"], ["off", "Exact surface diagnostic"]] }
    ],
    9: [
      { key: "checkerScale", label: "Checker frequency", type: "range", min: 1, max: 8, step: 1, value: 3 }
    ],
    10: [
      { key: "baryAlpha", label: "Weight α at vertex A", type: "range", min: 0, max: 1, step: 0.05, value: 0.28 },
      { key: "baryBeta", label: "Weight β at vertex B", type: "range", min: 0, max: 1, step: 0.05, value: 0.43 }
    ],
    11: [
      { key: "bounces", label: "Reflection bounce limit", type: "range", min: 0, max: 5, step: 1, value: 3 }
    ],
    12: [
      { key: "ior", label: "Glass index of refraction", type: "range", min: 1, max: 2.4, step: 0.05, value: 1.5 }
    ],
    13: [
      { key: "samples", label: "Samples per pixel", type: "select", value: "4", options: [["1", "1 centre sample"], ["4", "4 stratified samples"], ["9", "9 stratified samples"]] }
    ],
    14: [
      { key: "samples", label: "Samples per pixel", type: "select", value: "1", options: [["1", "1 sample (quick)"], ["4", "4 samples (clearer)"]] },
      { key: "acceleration", label: "Sphere traversal", type: "select", value: "bounds", options: [["linear", "Test every sphere"], ["bounds", "Test two bounded groups"]] }
    ]
  };

  var params = {};
  var initial = {};
  var definitions = CONTROL_DEFINITIONS[stage] || [];

  function displayValue(definition, value) {
    var text = String(value);
    if (definition.type === "range" && Number(definition.step) < 1) {
      var precision = String(definition.step).split(".")[1].length;
      text = Number(value).toFixed(precision);
    }
    return text + (definition.suffix || "");
  }

  function createControls() {
    definitions.forEach(function (definition) {
      params[definition.key] = definition.value;
      initial[definition.key] = definition.value;
      var wrapper = document.createElement("div");
      wrapper.className = "ray-control";
      var label = document.createElement("label");
      var id = "ray-control-" + definition.key;
      label.setAttribute("for", id);
      label.textContent = definition.label;
      var output = document.createElement("output");
      output.setAttribute("for", id);
      output.textContent = displayValue(definition, definition.value);
      var input;
      if (definition.type === "select") {
        input = document.createElement("select");
        definition.options.forEach(function (option) {
          var element = document.createElement("option");
          element.value = option[0];
          element.textContent = option[1];
          input.appendChild(element);
        });
      } else {
        input = document.createElement("input");
        input.type = "range";
        input.min = definition.min;
        input.max = definition.max;
        input.step = definition.step;
      }
      input.id = id;
      input.value = definition.value;
      input.addEventListener("input", function () {
        params[definition.key] = definition.type === "range" ? Number(input.value) : input.value;
        output.textContent = displayValue(definition, input.value);
        drawDiagram();
        if (stage === 1) {
          updatePixelFacts();
          renderImage();
        } else if (stage === 2) {
          updateStageTwoFacts();
          renderImage();
        } else if (stage <= 13) {
          updateConceptFacts();
          renderImage();
        } else {
          renderState.textContent = "Values changed";
        }
      });
      wrapper.appendChild(label);
      wrapper.appendChild(output);
      wrapper.appendChild(input);
      controlsRoot.appendChild(wrapper);
      definition.element = input;
      definition.output = output;
    });
  }

  function updatePixelFacts() {
    if (stage !== 1 || !pixelCoordinate) {
      return;
    }
    var x = Number(params.pixelX);
    var y = Number(params.pixelY);
    var number = y * 16 + x;
    var first = 4 * number;
    pixelCoordinate.textContent = "(" + x + ", " + y + ")";
    pixelNumber.textContent = String(number);
    pixelRange.textContent = first + "–" + (first + 3);
    pixelValues.textContent = "247, 184, 75, 255";
    pixelFormula.textContent = "4 × (" + y + " × 16 + " + x + ") = " + first;
  }

  function setStageOneSelection(x, y) {
    params.pixelX = clamp(x, 0, 15);
    params.pixelY = clamp(y, 0, 9);
    definitions.forEach(function (definition) {
      definition.element.value = params[definition.key];
      definition.output.textContent = displayValue(definition, params[definition.key]);
    });
    updatePixelFacts();
    drawDiagram();
    renderImage();
  }

  function setStageThreeSelection(column, row) {
    params.cameraPixelX = clamp(column, 0, 15);
    params.cameraPixelY = clamp(row, 0, 9);
    definitions.forEach(function (definition) {
      if (definition.key !== "cameraPixelX" && definition.key !== "cameraPixelY") {
        return;
      }
      definition.element.value = params[definition.key];
      definition.output.textContent = displayValue(definition, params[definition.key]);
    });
    updateConceptFacts();
    drawDiagram();
    renderImage();
  }

  function stageTwoState() {
    var rawX = Number(params.rawX);
    var rawY = Number(params.rawY);
    var rayT = Number(params.rayT);
    var magnitude = Math.sqrt(rawX * rawX + rawY * rawY);
    var directionX = rawX / magnitude;
    var directionY = rawY / magnitude;
    return {
      rawX: rawX,
      rawY: rawY,
      rayT: rayT,
      magnitude: magnitude,
      directionX: directionX,
      directionY: directionY,
      positionX: rayT * directionX,
      positionY: rayT * directionY
    };
  }

  function fixed3(value) {
    return Number(value).toFixed(3);
  }

  function pair2(x, y) {
    return "(" + fixed3(x) + ", " + fixed3(y) + ")";
  }

  function updateStageTwoFacts() {
    if (stage !== 2 || !vectorRaw) {
      return;
    }
    var state = stageTwoState();
    var rawPair = pair2(state.rawX, state.rawY);
    var unitPair = pair2(state.directionX, state.directionY);
    vectorRaw.textContent = rawPair;
    vectorLength.textContent = fixed3(state.magnitude);
    vectorUnit.textContent = unitPair;
    rayPosition.textContent = pair2(state.positionX, state.positionY);
    vectorFormula.textContent = "D = V ÷ |V| = " + rawPair + " ÷ " + fixed3(state.magnitude) + " = " + unitPair;
    positionFormula.textContent = "P(" + fixed3(state.rayT) + ") = (0, 0) + " + fixed3(state.rayT) + " × D = " + pair2(state.positionX, state.positionY);
  }

  var latestMetrics = null;

  function pair3(x, y, z) {
    return "(" + fixed3(x) + ", " + fixed3(y) + ", " + fixed3(z) + ")";
  }

  function setConceptOutput(selector, value) {
    var target = lab.querySelector(selector);
    if (target) {
      target.textContent = value;
    }
  }

  function cameraSampleState() {
    var column = Number(params.cameraPixelX);
    var row = Number(params.cameraPixelY);
    var fov = Number(params.fov);
    var viewportHeight = 2 * Math.tan(fov * Math.PI / 360);
    var viewportWidth = viewportHeight * 16 / 10;
    var sampleX = (column + 0.5) / 16;
    var sampleY = (row + 0.5) / 10;
    var planeX = (sampleX - 0.5) * viewportWidth;
    var planeY = (0.5 - sampleY) * viewportHeight;
    var direction = normalise(v(planeX, planeY, -1));
    return {
      column: column,
      row: row,
      fov: fov,
      sampleX: sampleX,
      sampleY: sampleY,
      planeX: planeX,
      planeY: planeY,
      direction: direction,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight
    };
  }

  function updateConceptFacts(metrics) {
    if (stage < 3) {
      return;
    }
    var counts = metrics || latestMetrics;
    if (stage === 3) {
      var camera = cameraSampleState();
      setConceptOutput("[data-camera-pixel]", "(" + camera.column + ", " + camera.row + ")");
      setConceptOutput("[data-camera-sample]", "(" + fixed3(camera.column + 0.5) + ", " + fixed3(camera.row + 0.5) + ")");
      setConceptOutput("[data-camera-plane]", pair3(camera.planeX, camera.planeY, -1));
      setConceptOutput("[data-camera-direction]", pair3(camera.direction[0], camera.direction[1], camera.direction[2]));
      setConceptOutput("[data-camera-formula]", "D = normalise" + pair3(camera.planeX, camera.planeY, -1) + " = " + pair3(camera.direction[0], camera.direction[1], camera.direction[2]));
    } else if (stage === 4) {
      var offset = Number(params.sphereX);
      var sphereRadius = 0.82;
      var discriminant = sphereRadius * sphereRadius - offset * offset;
      var rootText = "No real roots";
      var resultText = "MISS";
      var formulaText = "discriminant = " + fixed3(sphereRadius * sphereRadius) + " − " + fixed3(offset * offset) + " = " + fixed3(discriminant);
      if (discriminant >= 0) {
        var rootSpan = Math.sqrt(discriminant);
        var nearRoot = 3 - rootSpan;
        var farRoot = 3 + rootSpan;
        rootText = fixed3(nearRoot) + ", " + fixed3(farRoot);
        resultText = "HIT: keep t = " + fixed3(nearRoot);
        formulaText = "t = 3 ± √" + fixed3(discriminant) + " → " + rootText;
      }
      setConceptOutput("[data-sphere-offset]", fixed3(offset));
      setConceptOutput("[data-sphere-discriminant]", fixed3(discriminant));
      setConceptOutput("[data-sphere-roots]", rootText);
      setConceptOutput("[data-sphere-result]", resultText);
      setConceptOutput("[data-sphere-formula]", formulaText);
    } else if (stage === 5) {
      var redNear = 3.2 - 0.86;
      var blueNear = -Number(params.frontZ) - 0.7;
      var blueWins = blueNear < redNear;
      var closest = Math.min(redNear, blueNear);
      setConceptOutput("[data-closest-red]", fixed3(redNear));
      setConceptOutput("[data-closest-blue]", fixed3(blueNear));
      setConceptOutput("[data-closest-object]", blueWins ? "Blue sphere" : "Red sphere");
      setConceptOutput("[data-closest-distance]", fixed3(closest));
      setConceptOutput("[data-closest-formula]", "min(" + fixed3(redNear) + ", " + fixed3(blueNear) + ") = " + fixed3(closest));
    } else if (stage === 6) {
      var normalView = params.view === "normal";
      setConceptOutput("[data-record-distance]", "2.340");
      setConceptOutput("[data-record-normal]", "(0.000, 0.000, 1.000)");
      setConceptOutput("[data-record-albedo]", "(0.820, 0.240, 0.130)");
      setConceptOutput("[data-record-display]", normalView ? "Normal field" : "Albedo field");
      setConceptOutput("[data-record-formula]", normalView ? "RGB = 0.5 × (N + 1) = (0.500, 0.500, 1.000)" : "RGB = albedo = (0.820, 0.240, 0.130)");
    } else if (stage === 7) {
      var toLight = v(Number(params.lightX), 4.2, 0.1);
      var lightLength = length(toLight);
      var lightDirection = mul(toLight, 1 / lightLength);
      var diagnosticNormal = v(0, 1, 0);
      var diagnosticView = normalise(v(0.7, 0.8, 0.3));
      var halfVector = normalise(add(lightDirection, diagnosticView));
      var diffuseTerm = Math.max(0, dot(diagnosticNormal, lightDirection));
      var halfTerm = Math.max(0, dot(diagnosticNormal, halfVector));
      var specularTerm = Math.pow(halfTerm, Number(params.shininess));
      setConceptOutput("[data-light-direction]", pair3(lightDirection[0], lightDirection[1], lightDirection[2]));
      setConceptOutput("[data-light-diffuse]", fixed3(diffuseTerm));
      setConceptOutput("[data-light-half]", fixed3(halfTerm));
      setConceptOutput("[data-light-specular]", specularTerm.toExponential(2));
      setConceptOutput("[data-light-diffuse-formula]", "diffuse = max(0, N · L) = " + fixed3(diffuseTerm));
      setConceptOutput("[data-light-specular-formula]", "specular = " + fixed3(halfTerm) + "^" + params.shininess + " = " + specularTerm.toExponential(2));
    } else if (stage === 8) {
      var biasOn = params.bias !== "off";
      setConceptOutput("[data-shadow-epsilon]", biasOn ? "0.001" : "0.000");
      setConceptOutput("[data-shadow-origin]", biasOn ? "P + 0.001N" : "P exactly");
      setConceptOutput("[data-shadow-interval]", biasOn ? "[0.001, distance)" : "[0, distance)");
      setConceptOutput("[data-shadow-outcome]", biasOn ? "Self-hit excluded" : "t = 0 may be accepted");
      setConceptOutput("[data-shadow-formula]", biasOn ? "Oshadow = P + 0.001N" : "Oshadow = P: the boundary is still inside the query");
    } else if (stage === 9) {
      var checkerFrequency = Number(params.checkerScale);
      var checkerX = Math.floor(0.35 * checkerFrequency);
      var checkerZ = Math.floor(-1 * checkerFrequency);
      var checkerLight = (checkerX + checkerZ) % 2 === 0;
      setConceptOutput("[data-plane-denominator]", "-0.707");
      setConceptOutput("[data-plane-distance]", "2.828");
      setConceptOutput("[data-plane-position]", "(0.350, -1.000, -1.000)");
      setConceptOutput("[data-plane-checker]", "cell (" + checkerX + ", " + checkerZ + ") → " + (checkerLight ? "light" : "dark"));
      setConceptOutput("[data-plane-formula]", "t = (−2.000) ÷ (−0.707) = 2.828; checker uses floor(fP.x), floor(fP.z)");
    } else if (stage === 10) {
      var alpha = Number(params.baryAlpha);
      var beta = Number(params.baryBeta);
      var gamma = 1 - alpha - beta;
      var inside = gamma >= -1e-9;
      setConceptOutput("[data-bary-alpha]", fixed3(alpha));
      setConceptOutput("[data-bary-beta]", fixed3(beta));
      setConceptOutput("[data-bary-gamma]", fixed3(gamma));
      setConceptOutput("[data-bary-result]", inside ? "INSIDE" : "OUTSIDE: γ is negative");
      setConceptOutput("[data-bary-formula]", "γ = 1 − " + fixed3(alpha) + " − " + fixed3(beta) + " = " + fixed3(gamma) + "; P = αA + βB + γC");
    } else if (stage === 11) {
      setConceptOutput("[data-reflection-limit]", String(params.bounces));
      if (counts) {
        setConceptOutput("[data-total-rays]", (counts.primary + counts.reflection).toLocaleString("en-GB"));
      }
      setConceptOutput("[data-reflection-formula]", "R = D − 2(D · N)N; remaining depth = " + params.bounces);
    } else if (stage === 12) {
      var glassIor = Number(params.ior);
      var incidentAngle = Math.PI / 4;
      var transmittedAngle = Math.asin(Math.sin(incidentAngle) / glassIor);
      var baseReflectance = Math.pow((1 - glassIor) / (1 + glassIor), 2);
      var fresnel = baseReflectance + (1 - baseReflectance) * Math.pow(1 - Math.cos(incidentAngle), 5);
      setConceptOutput("[data-glass-ior]", fixed3(glassIor));
      setConceptOutput("[data-glass-angle]", (transmittedAngle * 180 / Math.PI).toFixed(3) + "°");
      setConceptOutput("[data-glass-fresnel]", (fresnel * 100).toFixed(1) + "%");
      if (counts) {
        setConceptOutput("[data-glass-branches]", "R " + counts.reflection.toLocaleString("en-GB") + " / T " + counts.transmission.toLocaleString("en-GB"));
      }
      setConceptOutput("[data-glass-formula]", "sin θ₂ = sin 45° ÷ " + fixed3(glassIor) + " → θ₂ = " + (transmittedAngle * 180 / Math.PI).toFixed(3) + "°");
    } else if (stage === 13) {
      var sampleCount = Number(params.samples);
      setConceptOutput("[data-sampling-raster]", "240 × 150 = 36,000 pixels");
      setConceptOutput("[data-sampling-count]", String(sampleCount));
      setConceptOutput("[data-sampling-work]", sampleCount + "×");
      setConceptOutput("[data-sampling-formula]", "36,000 pixels × " + sampleCount + " samples = " + (36000 * sampleCount).toLocaleString("en-GB") + " primary samples");
    } else if (stage === 14 && counts) {
      var totalRays = counts.primary + counts.shadow + counts.reflection + counts.transmission;
      setConceptOutput("[data-total-rays]", totalRays.toLocaleString("en-GB"));
      setConceptOutput("[data-account-formula]", "total rays = " + totalRays.toLocaleString("en-GB") + "; intersection checks = " + (counts.tests + counts.bounds).toLocaleString("en-GB"));
    }
  }

  function material(name, albedo, extra) {
    var value = { name: name, albedo: albedo, reflectivity: 0, specular: 0.2, shininess: 32 };
    Object.keys(extra || {}).forEach(function (key) { value[key] = extra[key]; });
    return value;
  }

  var MATERIALS = {
    clay: material("clay", v(0.82, 0.24, 0.13), { specular: 0.18 }),
    blue: material("blue", v(0.14, 0.42, 0.82), { specular: 0.34 }),
    moss: material("moss", v(0.16, 0.58, 0.34), { specular: 0.12 }),
    gold: material("gold", v(0.86, 0.58, 0.12), { specular: 0.52, shininess: 48 }),
    mirror: material("mirror", v(0.62, 0.72, 0.75), { reflectivity: 0.86, specular: 0.7, shininess: 80 }),
    glass: material("glass", v(0.88, 0.97, 1), { dielectric: true, ior: 1.5 }),
    checker: material("checker", v(0.72, 0.72, 0.68), { checker: true, specular: 0.08 })
  };

  function sphere(centre, radius, mat) { return { type: "sphere", centre: centre, radius: radius, material: mat }; }
  function plane(point, normal, mat) { return { type: "plane", point: point, normal: normalise(normal), material: mat }; }
  function triangle(a, b, c, mat) { return { type: "triangle", a: a, b: b, c: c, material: mat }; }

  function sceneForStage() {
    var objects = [];
    if (stage === 4) {
      objects.push(sphere(v(Number(params.sphereX || 0), 0, -3), 0.82, MATERIALS.gold));
    } else if (stage >= 5) {
      objects.push(sphere(v(-0.82, -0.14, -3.2), 0.86, MATERIALS.clay));
      objects.push(sphere(v(0.62, -0.24, stage === 5 ? Number(params.frontZ) : -2.65), 0.7, MATERIALS.blue));
      objects.push(sphere(v(0.12, 0.67, -3.75), 0.42, MATERIALS.moss));
    }
    if (stage >= 9) {
      objects.push(plane(v(0, -1, 0), v(0, 1, 0), MATERIALS.checker));
    }
    if (stage >= 10) {
      var tx = Number(params.triangleX || 0);
      objects.push(triangle(v(0.65 + tx, -0.95, -4.1), v(2.05 + tx, -0.95, -4.5), v(1.28 + tx, 0.72, -4.18), MATERIALS.gold));
    }
    if (stage >= 11) {
      objects.push(sphere(v(-2.02, -0.38, -4.25), 0.62, MATERIALS.mirror));
    }
    if (stage >= 12) {
      MATERIALS.glass.ior = Number(params.ior || 1.5);
      objects.push(sphere(v(1.65, -0.28, -3.32), 0.7, MATERIALS.glass));
    }
    if (stage >= 14) {
      var colours = [MATERIALS.clay, MATERIALS.blue, MATERIALS.moss, MATERIALS.gold];
      for (var i = 0; i < 10; i += 1) {
        var x = -2.4 + (i % 5) * 1.15;
        var z = -5.3 - Math.floor(i / 5) * 1.05;
        objects.push(sphere(v(x, -0.73, z), 0.25, colours[i % colours.length]));
      }
    }
    var lightX = stage === 7 ? Number(params.lightX) : -2.5;
    return { objects: objects, light: v(lightX, 4.2, 0.1), accelerated: stage === 14 && params.acceleration === "bounds" };
  }

  function cameraRay(u, vertical, fov, aspect) {
    var origin = v(0, 0.18, 1.5);
    var target = v(0, -0.08, -3.2);
    var forward = normalise(sub(target, origin));
    var right = normalise(cross(forward, v(0, 1, 0)));
    var up = cross(right, forward);
    var halfHeight = Math.tan(fov * Math.PI / 360);
    var halfWidth = aspect * halfHeight;
    var direction = add(forward, add(mul(right, (2 * u - 1) * halfWidth), mul(up, (1 - 2 * vertical) * halfHeight)));
    return { origin: origin, direction: normalise(direction) };
  }

  function faceRecord(ray, outward, record) {
    record.frontFace = dot(ray.direction, outward) < 0;
    record.normal = record.frontFace ? outward : mul(outward, -1);
    return record;
  }

  function intersectSphere(ray, object, tMin, tMax, metrics) {
    metrics.tests += 1;
    var oc = sub(ray.origin, object.centre);
    var a = dot(ray.direction, ray.direction);
    var halfB = dot(oc, ray.direction);
    var c = dot(oc, oc) - object.radius * object.radius;
    var discriminant = halfB * halfB - a * c;
    if (discriminant < 0) { return null; }
    var rootTerm = Math.sqrt(discriminant);
    var root = (-halfB - rootTerm) / a;
    if (root < tMin || root > tMax) {
      root = (-halfB + rootTerm) / a;
      if (root < tMin || root > tMax) { return null; }
    }
    var position = add(ray.origin, mul(ray.direction, root));
    return faceRecord(ray, mul(sub(position, object.centre), 1 / object.radius), {
      t: root, position: position, material: object.material, object: object
    });
  }

  function intersectPlane(ray, object, tMin, tMax, metrics) {
    metrics.tests += 1;
    var denominator = dot(ray.direction, object.normal);
    if (Math.abs(denominator) < 1e-7) { return null; }
    var distance = dot(sub(object.point, ray.origin), object.normal) / denominator;
    if (distance < tMin || distance > tMax) { return null; }
    return faceRecord(ray, object.normal, {
      t: distance,
      position: add(ray.origin, mul(ray.direction, distance)),
      material: object.material,
      object: object
    });
  }

  function intersectTriangle(ray, object, tMin, tMax, metrics) {
    metrics.tests += 1;
    var edge1 = sub(object.b, object.a);
    var edge2 = sub(object.c, object.a);
    var pVector = cross(ray.direction, edge2);
    var determinant = dot(edge1, pVector);
    if (Math.abs(determinant) < 1e-7) { return null; }
    var inverse = 1 / determinant;
    var tVector = sub(ray.origin, object.a);
    var baryU = dot(tVector, pVector) * inverse;
    if (baryU < 0 || baryU > 1) { return null; }
    var qVector = cross(tVector, edge1);
    var baryV = dot(ray.direction, qVector) * inverse;
    if (baryV < 0 || baryU + baryV > 1) { return null; }
    var distance = dot(edge2, qVector) * inverse;
    if (distance < tMin || distance > tMax) { return null; }
    return faceRecord(ray, normalise(cross(edge1, edge2)), {
      t: distance,
      position: add(ray.origin, mul(ray.direction, distance)),
      material: object.material,
      object: object,
      barycentric: v(1 - baryU - baryV, baryU, baryV)
    });
  }

  function boundsForSpheres(spheres) {
    var low = v(Infinity, Infinity, Infinity);
    var high = v(-Infinity, -Infinity, -Infinity);
    spheres.forEach(function (item) {
      for (var axis = 0; axis < 3; axis += 1) {
        low[axis] = Math.min(low[axis], item.centre[axis] - item.radius);
        high[axis] = Math.max(high[axis], item.centre[axis] + item.radius);
      }
    });
    return { low: low, high: high, spheres: spheres };
  }

  function intersectBounds(ray, bounds, tMin, tMax, metrics) {
    metrics.bounds += 1;
    for (var axis = 0; axis < 3; axis += 1) {
      var direction = ray.direction[axis];
      if (Math.abs(direction) < 1e-12) {
        if (ray.origin[axis] < bounds.low[axis] || ray.origin[axis] > bounds.high[axis]) {
          return false;
        }
        continue;
      }
      var inverse = 1 / direction;
      var near = (bounds.low[axis] - ray.origin[axis]) * inverse;
      var far = (bounds.high[axis] - ray.origin[axis]) * inverse;
      if (inverse < 0) {
        var swap = near;
        near = far;
        far = swap;
      }
      tMin = Math.max(tMin, near);
      tMax = Math.min(tMax, far);
      if (tMax < tMin) { return false; }
    }
    return true;
  }

  function testObject(ray, object, tMin, tMax, metrics) {
    if (object.type === "sphere") { return intersectSphere(ray, object, tMin, tMax, metrics); }
    if (object.type === "plane") { return intersectPlane(ray, object, tMin, tMax, metrics); }
    return intersectTriangle(ray, object, tMin, tMax, metrics);
  }

  function intersectScene(ray, scene, tMin, tMax, metrics) {
    var closest = tMax;
    var best = null;
    var spheres = [];
    var remaining = [];
    scene.objects.forEach(function (object) {
      if (object.type === "sphere") { spheres.push(object); } else { remaining.push(object); }
    });

    function consider(object) {
      var hit = testObject(ray, object, tMin, closest, metrics);
      if (hit) {
        closest = hit.t;
        best = hit;
      }
    }

    remaining.forEach(consider);
    if (scene.accelerated && spheres.length > 4) {
      var midpoint = Math.ceil(spheres.length / 2);
      [boundsForSpheres(spheres.slice(0, midpoint)), boundsForSpheres(spheres.slice(midpoint))].forEach(function (group) {
        if (intersectBounds(ray, group, tMin, closest, metrics)) {
          group.spheres.forEach(consider);
        }
      });
    } else {
      spheres.forEach(consider);
    }
    return best;
  }

  function surfaceAlbedo(record) {
    if (!record.material.checker) { return record.material.albedo; }
    var scale = Number(params.checkerScale || 3);
    var cell = Math.floor(record.position[0] * scale) + Math.floor(record.position[2] * scale);
    return Math.abs(cell % 2) === 0 ? v(0.76, 0.75, 0.67) : v(0.09, 0.13, 0.12);
  }

  function sky(direction) {
    var amount = 0.5 * (direction[1] + 1);
    return mix(v(0.06, 0.085, 0.11), v(0.48, 0.72, 0.88), amount);
  }

  function schlick(cosine, eta) {
    var base = (1 - eta) / (1 + eta);
    base *= base;
    return base + (1 - base) * Math.pow(1 - cosine, 5);
  }

  function trace(ray, scene, depth, metrics) {
    var record = intersectScene(ray, scene, EPSILON, FAR, metrics);
    if (!record) { return sky(ray.direction); }

    var albedo = surfaceAlbedo(record);
    if (stage === 4) { return v(0.94, 0.68, 0.2); }
    if (stage === 5) {
      var depthShade = clamp(1.15 - record.t * 0.08, 0.55, 1);
      return mul(albedo, depthShade);
    }
    if (stage === 6) {
      if (params.view === "albedo") { return albedo; }
      return mul(add(record.normal, v(1, 1, 1)), 0.5);
    }

    if (record.material.dielectric && stage >= 12) {
      if (depth <= 0) { return v(0.03, 0.04, 0.05); }
      var eta = record.frontFace ? 1 / record.material.ior : record.material.ior;
      var unitDirection = normalise(ray.direction);
      var cosine = Math.min(dot(mul(unitDirection, -1), record.normal), 1);
      var sine = Math.sqrt(1 - cosine * cosine);
      var cannotRefract = eta * sine > 1;
      var reflectedDirection = normalise(reflect(unitDirection, record.normal));
      metrics.reflection += 1;
      var reflected = trace({ origin: add(record.position, mul(record.normal, EPSILON)), direction: reflectedDirection }, scene, depth - 1, metrics);
      var reflectance = cannotRefract ? 1 : schlick(cosine, eta);
      if (cannotRefract) { return reflected; }
      var transmittedDirection = normalise(refract(unitDirection, record.normal, eta));
      metrics.transmission += 1;
      var transmitted = trace({ origin: sub(record.position, mul(record.normal, EPSILON)), direction: transmittedDirection }, scene, depth - 1, metrics);
      return add(mul(reflected, reflectance), mul(hadamard(transmitted, albedo), 1 - reflectance));
    }

    var toLight = sub(scene.light, record.position);
    var lightDistance = length(toLight);
    var lightDirection = mul(toLight, 1 / lightDistance);
    var diffuse = Math.max(0, dot(record.normal, lightDirection));
    var viewDirection = normalise(mul(ray.direction, -1));
    var halfDirection = normalise(add(lightDirection, viewDirection));
    var exponent = stage === 7 ? Number(params.shininess) : record.material.shininess;
    var specular = Math.pow(Math.max(0, dot(record.normal, halfDirection)), exponent) * record.material.specular;
    var visible = 1;

    if (stage >= 8 && diffuse > 0) {
      var useBias = !(stage === 8 && params.bias === "off");
      var bias = useBias ? EPSILON : 0;
      var shadowOrigin = add(record.position, mul(record.normal, bias));
      metrics.shadow += 1;
      var shadowMin = useBias ? EPSILON : -1e-8;
      if (intersectScene({ origin: shadowOrigin, direction: lightDirection }, scene, shadowMin, lightDistance - EPSILON, metrics)) {
        visible = 0;
      }
    }

    var attenuation = Math.min(1.45, 18 / (lightDistance * lightDistance));
    var local = add(mul(albedo, 0.055), add(mul(albedo, diffuse * attenuation * visible), mul(v(1, 0.96, 0.84), specular * attenuation * visible)));

    if (stage >= 11 && record.material.reflectivity > 0 && depth > 0) {
      var reflectionDirection = normalise(reflect(ray.direction, record.normal));
      metrics.reflection += 1;
      var reflectedColour = trace({ origin: add(record.position, mul(record.normal, EPSILON)), direction: reflectionDirection }, scene, depth - 1, metrics);
      local = mix(local, reflectedColour, record.material.reflectivity);
    }
    return local;
  }

  function pseudoRandom(seed) {
    var x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function sampleOffsets(sampleCount, x, y) {
    if (sampleCount === 1) { return [[0.5, 0.5]]; }
    var side = Math.round(Math.sqrt(sampleCount));
    var result = [];
    for (var sy = 0; sy < side; sy += 1) {
      for (var sx = 0; sx < side; sx += 1) {
        var index = sy * side + sx;
        var seed = (x + 1) * 73856093 + (y + 1) * 19349663 + index * 83492791;
        result.push([(sx + pseudoRandom(seed)) / side, (sy + pseudoRandom(seed + 17)) / side]);
      }
    }
    return result;
  }

  function renderDiagnostic(x, y, width, height) {
    if (stage === 1) {
      var selectedX = Number(params.pixelX);
      var selectedY = Number(params.pixelY);
      var cellX = Math.floor(x * 16 / width);
      var cellY = Math.floor(y * 10 / height);
      if (cellX === selectedX && cellY === selectedY) { return v(247 / 255, 184 / 255, 75 / 255); }
      return v(24 / 255, 42 / 255, 36 / 255);
    }
    var ray = cameraRay((x + 0.5) / width, (y + 0.5) / height, Number(params.fov), width / height);
    return mul(add(ray.direction, v(1, 1, 1)), 0.5);
  }

  function renderImage() {
    if (!imageCanvas) {
      updateConceptFacts();
      return;
    }
    if (stage === 2) {
      drawNormalisationDiagram();
      updateStageTwoFacts();
      renderState.textContent = "Direction updated";
      return;
    }
    if (stage === 3) {
      drawCameraSampleDiagram();
      updateConceptFacts();
      renderState.textContent = "Sample updated";
      return;
    }
    var start = performance.now();
    var width = stage === 1 ? 16 : (stage >= 13 ? 240 : 288);
    var height = stage === 1 ? 10 : Math.round(width * 5 / 8);
    imageCanvas.width = width;
    imageCanvas.height = height;
    var context = imageCanvas.getContext("2d", { alpha: false });
    var image = context.createImageData(width, height);
    var pixels = image.data;
    var metrics = { primary: 0, shadow: 0, reflection: 0, transmission: 0, tests: 0, bounds: 0 };
    var scene = stage >= 4 ? sceneForStage() : null;
    var samples = stage >= 13 ? Number(params.samples) : 1;
    var fov = stage === 3 ? Number(params.fov) : 52;
    var depth = stage === 11 ? Number(params.bounces) : (stage >= 12 ? 4 : 0);

    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        var colour = v(0, 0, 0);
        if (stage <= 3) {
          colour = renderDiagnostic(x, y, width, height);
          metrics.primary += 1;
        } else {
          var offsets = sampleOffsets(samples, x, y);
          offsets.forEach(function (offset) {
            var ray = cameraRay((x + offset[0]) / width, (y + offset[1]) / height, fov, width / height);
            metrics.primary += 1;
            colour = add(colour, trace(ray, scene, depth, metrics));
          });
          colour = mul(colour, 1 / samples);
        }
        var index = (y * width + x) * 4;
        colour = colourClamp(colour);
        pixels[index] = stage === 1 ? Math.round(255 * colour[0]) : Math.round(255 * Math.pow(colour[0], 1 / 2.2));
        pixels[index + 1] = stage === 1 ? Math.round(255 * colour[1]) : Math.round(255 * Math.pow(colour[1], 1 / 2.2));
        pixels[index + 2] = stage === 1 ? Math.round(255 * colour[2]) : Math.round(255 * Math.pow(colour[2], 1 / 2.2));
        pixels[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    var elapsed = performance.now() - start;
    metrics.time = elapsed;
    latestMetrics = metrics;
    updateMetrics(metrics);
    updateConceptFacts(metrics);
    renderState.textContent = stage === 1 ? "Address updated" : "Rendered";
    if (renderButton) {
      renderButton.disabled = false;
    }
  }

  function updateMetrics(metrics) {
    Object.keys(metrics).forEach(function (key) {
      var target = lab.querySelector('[data-metric="' + key + '"]');
      if (!target) { return; }
      target.textContent = key === "time" ? metrics[key].toFixed(1) + " ms" : metrics[key].toLocaleString("en-GB");
    });
  }

  function lineArrow(context, fromX, fromY, toX, toY, colour, label) {
    var angle = Math.atan2(toY - fromY, toX - fromX);
    context.strokeStyle = colour;
    context.fillStyle = colour;
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    context.beginPath();
    context.moveTo(toX, toY);
    context.lineTo(toX - 9 * Math.cos(angle - 0.45), toY - 9 * Math.sin(angle - 0.45));
    context.lineTo(toX - 9 * Math.cos(angle + 0.45), toY - 9 * Math.sin(angle + 0.45));
    context.closePath();
    context.fill();
    if (label) {
      var arrowLabelX = (fromX + toX) / 2 + 7;
      var arrowLabelY = (fromY + toY) / 2 - 8;
      context.font = stage >= 3 ? "700 15px Consolas, monospace" : "12px Consolas, monospace";
      if (stage >= 3) {
        var arrowLabelWidth = context.measureText(label).width;
        context.fillStyle = "rgba(2, 8, 6, 0.9)";
        context.fillRect(arrowLabelX - 4, arrowLabelY - 14, arrowLabelWidth + 8, 20);
        context.fillStyle = colour;
      }
      context.fillText(label, arrowLabelX, arrowLabelY);
    }
  }

  function dot2(context, x, y, radius, colour) {
    context.fillStyle = colour;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function label2(context, text, x, y, colour) {
    var labelColour = colour || "#c6d5cf";
    context.font = stage >= 3 ? "700 15px Segoe UI, sans-serif" : "12px Segoe UI, sans-serif";
    if (stage >= 3) {
      var labelWidth = context.measureText(text).width;
      context.fillStyle = "rgba(2, 8, 6, 0.88)";
      context.fillRect(x - 4, y - 15, labelWidth + 8, 21);
    }
    context.fillStyle = labelColour;
    context.fillText(text, x, y);
  }

  function statusBadge(context, text, colour) {
    var badgeColour = colour || "#f5b84b";
    context.font = "700 14px Consolas, monospace";
    var badgeWidth = context.measureText(text).width;
    var badgeX = context.canvas.width - badgeWidth - 24;
    context.fillStyle = "rgba(2, 8, 6, 0.94)";
    context.fillRect(badgeX - 8, 12, badgeWidth + 16, 28);
    context.strokeStyle = badgeColour;
    context.lineWidth = 1;
    context.strokeRect(badgeX - 8, 12, badgeWidth + 16, 28);
    context.fillStyle = badgeColour;
    context.fillText(text, badgeX, 31);
  }

  function drawCameraSampleDiagram() {
    var context = imageCanvas.getContext("2d");
    var state = cameraSampleState();
    var left = 48;
    var top = 30;
    var cellWidth = 24;
    var cellHeight = 24;
    context.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    context.fillStyle = "#020806";
    context.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    context.fillStyle = "rgb(24, 42, 36)";
    context.fillRect(left, top, cellWidth * 16, cellHeight * 10);
    context.strokeStyle = "rgba(198,213,207,0.25)";
    context.lineWidth = 1;
    for (var columnLine = 0; columnLine <= 16; columnLine += 1) {
      context.beginPath(); context.moveTo(left + columnLine * cellWidth, top); context.lineTo(left + columnLine * cellWidth, top + 10 * cellHeight); context.stroke();
    }
    for (var rowLine = 0; rowLine <= 10; rowLine += 1) {
      context.beginPath(); context.moveTo(left, top + rowLine * cellHeight); context.lineTo(left + 16 * cellWidth, top + rowLine * cellHeight); context.stroke();
    }
    context.fillStyle = "#f5b84b";
    context.fillRect(left + state.column * cellWidth + 1, top + state.row * cellHeight + 1, cellWidth - 2, cellHeight - 2);
    dot2(context, left + (state.column + 0.5) * cellWidth, top + (state.row + 0.5) * cellHeight, 4, "#fff3cf");
    statusBadge(context, "pixel (" + state.column + ", " + state.row + ")", "#f5b84b");
  }

  function drawNormalisationDiagram() {
    var context = imageCanvas.getContext("2d");
    var width = imageCanvas.width;
    var height = imageCanvas.height;
    var state = stageTwoState();
    var originX = 95;
    var originY = 150;
    var scale = 43;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#020806";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(170,214,199,0.12)";
    context.lineWidth = 1;
    for (var gridX = 0; gridX < width; gridX += 40) {
      context.beginPath(); context.moveTo(gridX, 0); context.lineTo(gridX, height); context.stroke();
    }
    for (var gridY = 0; gridY < height; gridY += 40) {
      context.beginPath(); context.moveTo(0, gridY); context.lineTo(width, gridY); context.stroke();
    }
    context.strokeStyle = "rgba(116,215,255,0.45)";
    context.beginPath(); context.moveTo(40, originY); context.lineTo(280, originY); context.stroke();
    context.beginPath(); context.moveTo(originX, 22); context.lineTo(originX, 278); context.stroke();
    label2(context, "x", 268, originY - 9, "#ef6f6c");
    label2(context, "y", originX + 9, 34, "#74d7ff");
    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = "rgba(120,240,178,0.52)";
    context.beginPath(); context.arc(originX, originY, scale, 0, Math.PI * 2); context.stroke();
    context.restore();
    label2(context, "length 1", originX - 28, originY + scale + 19, "#78f0b2");
    lineArrow(context, originX, originY, originX + state.rawX * scale, originY - state.rawY * scale, "#ef6f6c", "V");
    lineArrow(context, originX, originY, originX + state.directionX * scale, originY - state.directionY * scale, "#78f0b2", "D");
    dot2(context, originX, originY, 6, "#f5b84b");
    label2(context, "same direction", 310, 74, "#f5b84b");
    label2(context, "V = " + pair2(state.rawX, state.rawY), 310, 110, "#ef6f6c");
    label2(context, "|V| = " + fixed3(state.magnitude), 310, 134, "#ef6f6c");
    label2(context, "D = " + pair2(state.directionX, state.directionY), 310, 178, "#78f0b2");
    label2(context, "|D| = 1.000", 310, 202, "#78f0b2");
    label2(context, "D = V ÷ |V|", 310, 246, "#c6d5cf");
  }

  var DIAGRAM_LABELS = [
    "", "Address is not value", "P(t) = O + tD", "Selected primary direction", "Discriminant and roots", "Minimum positive t", "Same record, selected field", "Diffuse and specular terms", "P versus P + εN", "Fixed hit, changed material", "α + β + γ = 1", "Reflection and depth", "Snell and Fresnel", "Samples inside one pixel", "Ray and intersection work"
  ];

  function drawDiagram() {
    var context = diagramCanvas.getContext("2d");
    var width = diagramCanvas.width;
    var height = diagramCanvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#020806";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(170,214,199,0.15)";
    context.lineWidth = 1;
    for (var gridX = 0; gridX < width; gridX += 40) {
      context.beginPath(); context.moveTo(gridX, 0); context.lineTo(gridX, height); context.stroke();
    }
    for (var gridY = 0; gridY < height; gridY += 40) {
      context.beginPath(); context.moveTo(0, gridY); context.lineTo(width, gridY); context.stroke();
    }
    diagramLabel.textContent = DIAGRAM_LABELS[stage];

    if (stage === 1) {
      var selectedColumn = Number(params.pixelX);
      var selectedRow = Number(params.pixelY);
      var selectedNumber = selectedRow * 16 + selectedColumn;
      var firstIndex = 4 * selectedNumber;
      context.fillStyle = "#f5b84b";
      context.fillRect(24, 78, 92, 92);
      context.strokeStyle = "#fff3cf";
      context.lineWidth = 2;
      context.strokeRect(24, 78, 92, 92);
      label2(context, "gold pixel", 43, 116, "#03100d");
      label2(context, "(" + selectedColumn + ", " + selectedRow + ")", 47, 143, "#03100d");
      lineArrow(context, 116, 124, 148, 124, "#78f0b2", "");
      label2(context, "ADDRESS changes", 166, 40, "#f5b84b");
      ["R", "G", "B", "A"].forEach(function (channel, channelIndex) {
        var boxX = 154 + channelIndex * 80;
        var channelColours = ["#ef6f6c", "#78f0b2", "#74d7ff", "#c6d5cf"];
        context.fillStyle = "rgba(255,255,255,0.04)";
        context.strokeStyle = channelColours[channelIndex];
        context.lineWidth = 2;
        context.fillRect(boxX, 70, 68, 108);
        context.strokeRect(boxX, 70, 68, 108);
        label2(context, channel, boxX + 29, 94, channelColours[channelIndex]);
        label2(context, "address", boxX + 12, 119, "#9eb3aa");
        label2(context, String(firstIndex + channelIndex), boxX + 24, 138, "#f3fbf7");
        label2(context, "value " + [247, 184, 75, 255][channelIndex], boxX + 9, 162, channelColours[channelIndex]);
      });
      label2(context, "VALUES stay 247, 184, 75, 255", 143, 218, "#78f0b2");
      label2(context, "pixel " + selectedNumber + " begins at address " + firstIndex, 127, 242, "#c6d5cf");
    } else if (stage === 2) {
      var stageTwo = stageTwoState();
      var rayOriginX = 65;
      var rayOriginY = 150;
      var rayScale = 43;
      context.strokeStyle = "rgba(116,215,255,0.38)";
      context.beginPath(); context.moveTo(35, rayOriginY); context.lineTo(270, rayOriginY); context.stroke();
      context.beginPath(); context.moveTo(rayOriginX, 20); context.lineTo(rayOriginX, 280); context.stroke();
      label2(context, "x", 258, rayOriginY - 8, "#ef6f6c");
      label2(context, "y", rayOriginX + 8, 33, "#74d7ff");
      lineArrow(
        context,
        rayOriginX,
        rayOriginY,
        rayOriginX + stageTwo.directionX * 3.25 * rayScale,
        rayOriginY - stageTwo.directionY * 3.25 * rayScale,
        "#78f0b2",
        "D"
      );
      for (var rayMark = 1; rayMark <= 3; rayMark += 1) {
        var markX = rayOriginX + stageTwo.directionX * rayMark * rayScale;
        var markY = rayOriginY - stageTwo.directionY * rayMark * rayScale;
        dot2(context, markX, markY, 4, "#74d7ff");
        label2(context, "t=" + rayMark, markX + 7, markY - 7, "#c6d5cf");
      }
      var positionX = rayOriginX + stageTwo.positionX * rayScale;
      var positionY = rayOriginY - stageTwo.positionY * rayScale;
      dot2(context, rayOriginX, rayOriginY, 7, "#f5b84b");
      label2(context, "O = (0, 0)", rayOriginX - 25, rayOriginY + 25, "#f5b84b");
      dot2(context, positionX, positionY, 8, "#f5b84b");
      label2(context, "selected P(t)", positionX + 10, positionY + 18, "#f5b84b");
      label2(context, "O stays (0, 0)", 305, 72, "#f5b84b");
      label2(context, "D stays " + pair2(stageTwo.directionX, stageTwo.directionY), 305, 116, "#78f0b2");
      label2(context, "t = " + fixed3(stageTwo.rayT), 305, 160, "#74d7ff");
      label2(context, "P(t) = " + pair2(stageTwo.positionX, stageTwo.positionY), 305, 204, "#f3fbf7");
      label2(context, "distance from O = t", 305, 248, "#c6d5cf");
    } else if (stage === 3) {
      var cameraState = cameraSampleState();
      var cameraOriginX = 62;
      var cameraOriginY = 130;
      var cameraPlaneX = 270;
      var cameraScale = 85;
      var cameraHalfHeight = cameraState.viewportHeight * 0.5 * cameraScale;
      var cameraSampleY = cameraOriginY - cameraState.planeY * cameraScale;
      dot2(context, cameraOriginX, cameraOriginY, 8, "#f5b84b");
      label2(context, "O", cameraOriginX - 18, cameraOriginY + 5, "#f5b84b");
      context.strokeStyle = "rgba(120,240,178,0.46)"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(cameraOriginX, cameraOriginY); context.lineTo(cameraPlaneX, cameraOriginY - cameraHalfHeight); context.moveTo(cameraOriginX, cameraOriginY); context.lineTo(cameraPlaneX, cameraOriginY + cameraHalfHeight); context.stroke();
      context.strokeStyle = "#74d7ff"; context.lineWidth = 3;
      context.beginPath(); context.moveTo(cameraPlaneX, cameraOriginY - cameraHalfHeight); context.lineTo(cameraPlaneX, cameraOriginY + cameraHalfHeight); context.stroke();
      var cameraRayEndY = cameraOriginY + (cameraSampleY - cameraOriginY) * (368 / (cameraPlaneX - cameraOriginX));
      lineArrow(context, cameraOriginX, cameraOriginY, 430, cameraRayEndY, "#f5b84b", "");
      label2(context, "D", 407, cameraRayEndY - 10, "#f5b84b");
      dot2(context, cameraPlaneX, cameraSampleY, 7, "#fff3cf");
      label2(context, "S", cameraPlaneX + 12, cameraSampleY - 8, "#f5b84b");
      statusBadge(context, "FOV " + params.fov + "°", "#74d7ff");
    } else if (stage === 4) {
      var sphereOffset = Number(params.sphereX);
      var sphereDisc = 0.82 * 0.82 - sphereOffset * sphereOffset;
      var sphereDiagramOriginX = 58;
      var sphereDiagramY = 130;
      var sphereDiagramScale = 70;
      var sphereCentreX = sphereDiagramOriginX + 3 * sphereDiagramScale;
      var sphereCentreY = sphereDiagramY + sphereOffset * sphereDiagramScale;
      dot2(context, sphereDiagramOriginX, sphereDiagramY, 7, "#f5b84b");
      lineArrow(context, sphereDiagramOriginX, sphereDiagramY, 440, sphereDiagramY, "#78f0b2", "D");
      context.strokeStyle = "#74d7ff"; context.lineWidth = 2; context.beginPath(); context.arc(sphereCentreX, sphereCentreY, 0.82 * sphereDiagramScale, 0, Math.PI * 2); context.stroke();
      dot2(context, sphereCentreX, sphereCentreY, 5, "#74d7ff");
      label2(context, "C", sphereCentreX + 10, sphereCentreY - 10, "#74d7ff");
      if (sphereDisc >= 0) {
        var sphereRootSpan = Math.sqrt(sphereDisc);
        var sphereNear = 3 - sphereRootSpan;
        var sphereFar = 3 + sphereRootSpan;
        dot2(context, sphereDiagramOriginX + sphereNear * sphereDiagramScale, sphereDiagramY, 7, "#f5b84b");
        dot2(context, sphereDiagramOriginX + sphereFar * sphereDiagramScale, sphereDiagramY, 6, "#c6d5cf");
        label2(context, "t₀", sphereDiagramOriginX + sphereNear * sphereDiagramScale - 8, sphereDiagramY + 34, "#f5b84b");
        label2(context, "t₁", sphereDiagramOriginX + sphereFar * sphereDiagramScale - 8, sphereDiagramY + 34, "#c6d5cf");
      }
      statusBadge(context, sphereDisc >= 0 ? "HIT" : "MISS", sphereDisc >= 0 ? "#78f0b2" : "#ef6f6c");
    } else if (stage === 5) {
      var compareOriginX = 70;
      var compareY = 136;
      var compareScale = 75;
      var compareRedNear = 3.2 - 0.86;
      var compareBlueNear = -Number(params.frontZ) - 0.7;
      var compareBlueWins = compareBlueNear < compareRedNear;
      lineArrow(context, compareOriginX, compareY, 445, compareY, "#f3fbf7", "D");
      dot2(context, compareOriginX, compareY, 7, "#f5b84b");
      context.strokeStyle = "#ef6f6c"; context.lineWidth = 2; context.beginPath(); context.arc(compareOriginX + 3.2 * compareScale, compareY, 0.86 * compareScale, 0, Math.PI * 2); context.stroke();
      context.strokeStyle = "#74d7ff"; context.beginPath(); context.arc(compareOriginX + (-Number(params.frontZ)) * compareScale, compareY, 0.7 * compareScale, 0, Math.PI * 2); context.stroke();
      dot2(context, compareOriginX + compareRedNear * compareScale, compareY, compareBlueWins ? 5 : 8, compareBlueWins ? "#ef6f6c" : "#f5b84b");
      dot2(context, compareOriginX + compareBlueNear * compareScale, compareY, compareBlueWins ? 8 : 5, compareBlueWins ? "#f5b84b" : "#74d7ff");
      label2(context, "red", compareOriginX + 3.2 * compareScale - 12, 54, "#ef6f6c");
      label2(context, "blue", compareOriginX + (-Number(params.frontZ)) * compareScale - 15, 82, "#74d7ff");
      statusBadge(context, "keep " + (compareBlueWins ? "blue" : "red"), "#f5b84b");
    } else if (stage === 6) {
      context.strokeStyle = "#74d7ff"; context.lineWidth = 2; context.beginPath(); context.arc(275, 142, 73, 0, Math.PI * 2); context.stroke();
      lineArrow(context, 55, 175, 220, 151, "#f3fbf7", "D");
      lineArrow(context, 220, 151, 164, 95, "#78f0b2", "N");
      dot2(context, 220, 151, 6, "#f5b84b");
      var recordFields = [[60, "t"], [155, "P"], [250, "N"], [345, "M"]];
      recordFields.forEach(function (field) {
        var selectedRecordField = (params.view === "normal" && field[1] === "N") || (params.view === "albedo" && field[1] === "M");
        context.fillStyle = selectedRecordField ? "rgba(245,184,75,0.2)" : "rgba(255,255,255,0.035)";
        context.strokeStyle = selectedRecordField ? "#f5b84b" : "rgba(198,213,207,0.3)";
        context.fillRect(field[0], 202, 70, 44); context.strokeRect(field[0], 202, 70, 44);
        label2(context, field[1], field[0] + 28, 230, selectedRecordField ? "#f5b84b" : "#c6d5cf");
      });
      statusBadge(context, params.view === "normal" ? "read N" : "read M", "#f5b84b");
    } else if (stage === 7) {
      var lightingPoint = v(Number(params.lightX), 4.2, 0.1);
      var lightingDirection = normalise(lightingPoint);
      var lightingNormal = v(0, 1, 0);
      var lightingView = normalise(v(0.7, 0.8, 0.3));
      var lightingHalf = normalise(add(lightingDirection, lightingView));
      var lightingDiffuse = Math.max(0, dot(lightingNormal, lightingDirection));
      var lightingHalfDot = Math.max(0, dot(lightingNormal, lightingHalf));
      dot2(context, 238, 150, 7, "#f5b84b");
      var normalEnd = [238, 50];
      var lightEnd = [238 + lightingDirection[0] * 118, 150 - lightingDirection[1] * 118];
      var viewEnd = [238 + lightingView[0] * 118, 150 - lightingView[1] * 118];
      var halfEnd = [238 + lightingHalf[0] * 128, 150 - lightingHalf[1] * 128];
      lineArrow(context, 238, 150, normalEnd[0], normalEnd[1], "#78f0b2", "");
      lineArrow(context, 238, 150, lightEnd[0], lightEnd[1], "#f5b84b", "");
      lineArrow(context, 238, 150, viewEnd[0], viewEnd[1], "#74d7ff", "");
      lineArrow(context, 238, 150, halfEnd[0], halfEnd[1], "#b4a2ff", "");
      label2(context, "N", normalEnd[0] + 9, normalEnd[1] + 6, "#78f0b2");
      label2(context, "L", lightEnd[0] - 18, lightEnd[1] - 8, "#f5b84b");
      label2(context, "V", viewEnd[0] + 8, viewEnd[1] + 4, "#74d7ff");
      label2(context, "H", halfEnd[0] + 8, halfEnd[1] + 4, "#b4a2ff");
      statusBadge(context, "s = " + params.shininess, "#b4a2ff");
    } else if (stage === 8) {
      var shadowBiasOn = params.bias !== "off";
      var surfaceX = 178;
      var surfaceY = 164;
      context.strokeStyle = "#74d7ff"; context.lineWidth = 3; context.beginPath(); context.moveTo(40, surfaceY); context.lineTo(330, surfaceY); context.stroke();
      lineArrow(context, surfaceX, surfaceY, surfaceX, 70, "#78f0b2", "N");
      dot2(context, surfaceX, surfaceY, 8, "#f5b84b");
      label2(context, "P", surfaceX - 20, surfaceY + 24, "#f5b84b");
      dot2(context, surfaceX, 104, 7, shadowBiasOn ? "#78f0b2" : "rgba(198,213,207,0.35)");
      label2(context, "P′", surfaceX + 13, 108, shadowBiasOn ? "#78f0b2" : "#9eb3aa");
      dot2(context, 420, 48, 8, "#f5b84b");
      label2(context, "L", 430, 48, "#f5b84b");
      lineArrow(context, surfaceX, shadowBiasOn ? 104 : surfaceY, 420, 48, shadowBiasOn ? "#78f0b2" : "#ef6f6c", "S");
      statusBadge(context, shadowBiasOn ? "origin P′" : "origin P", shadowBiasOn ? "#78f0b2" : "#ef6f6c");
    } else if (stage === 9) {
      var planeFrequency = Number(params.checkerScale);
      context.strokeStyle = "#74d7ff"; context.lineWidth = 3; context.beginPath(); context.moveTo(40, 180); context.lineTo(440, 180); context.stroke();
      for (var planeCell = 0; planeCell < planeFrequency * 2; planeCell += 1) {
        context.fillStyle = planeCell % 2 === 0 ? "rgba(198,213,207,0.16)" : "rgba(20,42,36,0.55)";
        context.fillRect(40 + planeCell * 400 / (planeFrequency * 2), 181, 400 / (planeFrequency * 2), 32);
      }
      lineArrow(context, 90, 45, 260, 180, "#78f0b2", "D");
      lineArrow(context, 260, 180, 260, 90, "#f5b84b", "N");
      dot2(context, 260, 180, 7, "#f5b84b");
      label2(context, "P", 273, 174, "#f5b84b");
      statusBadge(context, "frequency " + planeFrequency, "#f5b84b");
    } else if (stage === 10) {
      var baryAlpha = Number(params.baryAlpha);
      var baryBeta = Number(params.baryBeta);
      var baryGamma = 1 - baryAlpha - baryBeta;
      var triangleA = [120, 210];
      var triangleB = [390, 198];
      var triangleC = [280, 46];
      var baryPointX = baryAlpha * triangleA[0] + baryBeta * triangleB[0] + baryGamma * triangleC[0];
      var baryPointY = baryAlpha * triangleA[1] + baryBeta * triangleB[1] + baryGamma * triangleC[1];
      context.fillStyle = "rgba(116,215,255,0.18)"; context.strokeStyle = "#74d7ff"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(triangleA[0], triangleA[1]); context.lineTo(triangleB[0], triangleB[1]); context.lineTo(triangleC[0], triangleC[1]); context.closePath(); context.fill(); context.stroke();
      context.setLineDash([5, 5]);
      context.strokeStyle = "rgba(198,213,207,0.36)";
      [triangleA, triangleB, triangleC].forEach(function (vertex) {
        context.beginPath(); context.moveTo(baryPointX, baryPointY); context.lineTo(vertex[0], vertex[1]); context.stroke();
      });
      context.setLineDash([]);
      dot2(context, triangleA[0], triangleA[1], 7, "#ef6f6c");
      dot2(context, triangleB[0], triangleB[1], 7, "#78f0b2");
      dot2(context, triangleC[0], triangleC[1], 7, "#74d7ff");
      label2(context, "A  α=" + fixed3(baryAlpha), triangleA[0] - 38, triangleA[1] + 25, "#ef6f6c");
      label2(context, "B  β=" + fixed3(baryBeta), triangleB[0] - 17, triangleB[1] + 25, "#78f0b2");
      label2(context, "C  γ=" + fixed3(baryGamma), triangleC[0] - 35, triangleC[1] - 15, "#74d7ff");
      dot2(context, baryPointX, baryPointY, 8, baryGamma >= 0 ? "#f5b84b" : "#ef6f6c");
      label2(context, "P", baryPointX + 10, baryPointY - 10, baryGamma >= 0 ? "#f5b84b" : "#ef6f6c");
      label2(context, "P = αA + βB + γC", 154, 272, "#c6d5cf");
      statusBadge(context, baryGamma >= 0 ? "INSIDE" : "OUTSIDE", baryGamma >= 0 ? "#78f0b2" : "#ef6f6c");
    } else if (stage === 11) {
      dot2(context, 238, 150, 7, "#f5b84b");
      lineArrow(context, 70, 60, 238, 150, "#f3fbf7", "D");
      lineArrow(context, 238, 150, 405, 60, "#78f0b2", "R");
      lineArrow(context, 238, 150, 238, 62, "#74d7ff", "N");
      var bounceLimit = Number(params.bounces);
      for (var bounceIndex = 0; bounceIndex <= 5; bounceIndex += 1) {
        var bounceX = 105 + bounceIndex * 55;
        context.fillStyle = bounceIndex <= bounceLimit ? "#f5b84b" : "rgba(198,213,207,0.18)";
        context.fillRect(bounceX, 226, 34, 20);
        label2(context, String(bounceIndex), bounceX + 13, 241, bounceIndex <= bounceLimit ? "#03100d" : "#9eb3aa");
      }
      statusBadge(context, "depth " + bounceLimit, "#f5b84b");
    } else if (stage === 12) {
      var diagramIor = Number(params.ior);
      var diagramIncident = Math.PI / 4;
      var diagramTransmit = Math.asin(Math.sin(diagramIncident) / diagramIor);
      var diagramR0 = Math.pow((1 - diagramIor) / (1 + diagramIor), 2);
      var diagramFresnel = diagramR0 + (1 - diagramR0) * Math.pow(1 - Math.cos(diagramIncident), 5);
      var boundaryX = 238;
      var boundaryY = 130;
      context.fillStyle = "rgba(116,215,255,0.07)"; context.fillRect(0, boundaryY, width, height - boundaryY);
      context.strokeStyle = "#74d7ff"; context.lineWidth = 2; context.beginPath(); context.moveTo(35, boundaryY); context.lineTo(445, boundaryY); context.stroke();
      context.setLineDash([5, 5]); context.strokeStyle = "rgba(198,213,207,0.35)"; context.beginPath(); context.moveTo(boundaryX, 18); context.lineTo(boundaryX, 250); context.stroke(); context.setLineDash([]);
      dot2(context, boundaryX, boundaryY, 7, "#f5b84b");
      lineArrow(context, boundaryX - 92, boundaryY - 92, boundaryX, boundaryY, "#f3fbf7", "I");
      lineArrow(context, boundaryX, boundaryY, boundaryX + 92, boundaryY - 92, "#78f0b2", "R");
      lineArrow(context, boundaryX, boundaryY, boundaryX + Math.sin(diagramTransmit) * 112, boundaryY + Math.cos(diagramTransmit) * 112, "#b4a2ff", "T");
      label2(context, "air", 55, 45, "#c6d5cf");
      label2(context, "glass", 55, 214, "#74d7ff");
      label2(context, "N", boundaryX + 12, 42, "#c6d5cf");
      statusBadge(context, "η₂ " + fixed3(diagramIor), "#74d7ff");
    } else if (stage === 13) {
      var count = Number(params.samples);
      var side = Math.round(Math.sqrt(count));
      context.strokeStyle = "#74d7ff"; context.lineWidth = 2; context.strokeRect(142, 34, 196, 196);
      for (var gx = 1; gx < side; gx += 1) { context.beginPath(); context.moveTo(142 + gx * 196 / side, 34); context.lineTo(142 + gx * 196 / side, 230); context.stroke(); }
      for (var gy = 1; gy < side; gy += 1) { context.beginPath(); context.moveTo(142, 34 + gy * 196 / side); context.lineTo(338, 34 + gy * 196 / side); context.stroke(); }
      for (var sy = 0; sy < side; sy += 1) { for (var sx = 0; sx < side; sx += 1) { dot2(context, 142 + (sx + 0.43) * 196 / side, 34 + (sy + 0.57) * 196 / side, 5, "#f5b84b"); } }
      statusBadge(context, count + " sample" + (count === 1 ? "" : "s"), "#f5b84b");
    } else {
      var boxes = [[20, "Camera"], [104, "Test"], [204, "Shade"], [292, "Spawn"], [388, "Store"]];
      boxes.forEach(function (item, index) {
        context.fillStyle = index % 2 ? "rgba(116,215,255,0.16)" : "rgba(120,240,178,0.14)";
        context.strokeStyle = index % 2 ? "#74d7ff" : "#78f0b2";
        context.fillRect(item[0], 102, 72, 48); context.strokeRect(item[0], 102, 72, 48); label2(context, item[1], item[0] + 8, 131);
        if (index < boxes.length - 1) { lineArrow(context, item[0] + 72, 126, boxes[index + 1][0], 126, "#f5b84b", ""); }
      });
      statusBadge(context, params.acceleration === "bounds" ? "bounds" : "linear", "#f5b84b");
    }
  }

  var PROOF_NOTES = {
    1: "The address tells us where to store the pixel; the RGBA values tell us which colour to store there.",
    2: "Because D has unit length, t is also the distance from O to P(t).",
    3: "No surface test has been performed; this laboratory establishes the primary camera direction only.",
    4: "No circle command draws the sphere. A pixel is coloured only when its ray produces a valid quadratic root.",
    5: "Object order does not decide visibility; the retained minimum distance does.",
    6: "The normal and albedo views read different fields from the same hit record.",
    7: "The hit point, normal and view direction stay fixed throughout this comparison.",
    8: "The un-biased mode deliberately exposes the zero-distance boundary that a finite-precision implementation must handle.",
    9: "The checker is a material decision made after the plane intersection has supplied P.",
    10: "The same weights can interpolate colour, texture coordinates or vertex normals at P.",
    11: "Increasing the bounce limit can change both the image and the number of rays; recursion has a visible computational cost.",
    12: "The material index and hit orientation decide whether a transmitted direction exists and how much contribution reflects.",
    13: "The raster still stores 36,000 pixels; only the number of estimates contributing to each pixel changes.",
    14: "The same image question can be organised differently; bounding tests are worthwhile only when they reject enough primitive tests."
  };

  function queueRender() {
    if (renderButton) {
      renderButton.disabled = true;
    }
    renderState.textContent = "Rendering…";
    window.setTimeout(renderImage, 20);
  }

  if (renderButton) {
    renderButton.addEventListener("click", queueRender);
  }
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      definitions.forEach(function (definition) {
        params[definition.key] = initial[definition.key];
        definition.element.value = initial[definition.key];
        definition.output.textContent = displayValue(definition, initial[definition.key]);
      });
      drawDiagram();
      queueRender();
    });
  }

  createControls();
  if (stage === 1) {
    imageCanvas.addEventListener("click", function (event) {
      var rectangle = imageCanvas.getBoundingClientRect();
      var column = Math.floor((event.clientX - rectangle.left) * 16 / rectangle.width);
      var row = Math.floor((event.clientY - rectangle.top) * 10 / rectangle.height);
      setStageOneSelection(column, row);
    });
  } else if (stage === 3) {
    imageCanvas.addEventListener("click", function (event) {
      var cameraRectangle = imageCanvas.getBoundingClientRect();
      var internalX = (event.clientX - cameraRectangle.left) * imageCanvas.width / cameraRectangle.width;
      var internalY = (event.clientY - cameraRectangle.top) * imageCanvas.height / cameraRectangle.height;
      var cameraColumn = Math.floor((internalX - 48) / 24);
      var cameraRow = Math.floor((internalY - 30) / 24);
      if (cameraColumn >= 0 && cameraColumn < 16 && cameraRow >= 0 && cameraRow < 10) {
        setStageThreeSelection(cameraColumn, cameraRow);
      }
    });
  }
  proofNote.textContent = PROOF_NOTES[stage];
  updatePixelFacts();
  updateStageTwoFacts();
  drawDiagram();
  if (stage <= 13) {
    renderImage();
  } else {
    queueRender();
  }
}());
