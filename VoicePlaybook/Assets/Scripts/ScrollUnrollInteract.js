//@input Component.AnimationPlayer anim1
//@input Component.ScriptComponent tween
//@input Component.LookAtComponent look

const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionManager = SIK.InteractionManager;
const interactionConfiguration = SIK.InteractionConfiguration;

var opened = false;
var timer = 0.0;

function onAwake() {
  // Wait for other components to initialize by deferring to OnStartEvent.
  script.createEvent('OnStartEvent').bind(() => {
    onStart();
  });
}

function onStart() {
  // This script assumes that an Interactable (and Collider) component have already been instantiated on the SceneObject.
  var interactableTypename =
    interactionConfiguration.requireType('Interactable');
  var interactable = script.sceneObject.getComponent(interactableTypename);

  // You could also retrieve the Interactable component like this:
  interactable = interactionManager.getInteractableBySceneObject(
    script.sceneObject
  );
    
  function onUpdate(){
        print(anim1.getClipIsPlaying('Take 001'));
        
        if(opened){
            
        }
    }

  // Define the desired callback logic for the relevant Interactable event.
  var onTriggerStartCallback = (event) => {
        opened = !opened;
    if(opened){
        var clip = script.anim1.getClip("Take 001");
        clip.reversed = false;
            
         script.anim1.playClipAt('Take 001', 0);
            
        script.tween.enabled = false;
        script.look.enabled = true;
    }else{
        print("Closing");
        var clip = script.anim1.getClip("Take 001");
        clip.reversed = true; // Play backward
        
        // Play from end of clip
        script.anim1.playClipAt('Take 001', clip.duration);
            
        script.tween.enabled = true;
        script.look.enabled = false;

    }
  };
    

  interactable.onInteractorTriggerStart(onTriggerStartCallback);
}


onAwake();