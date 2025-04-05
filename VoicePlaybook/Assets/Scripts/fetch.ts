/*
declare function atob(str: string): string;

  
@component
export class FetchNote extends BaseScriptComponent {
  @input notePrefab!: ObjectPrefab; // Prefab that displays each note
  @input remoteServiceModule: RemoteServiceModule;
  @input audioOutputAsset: AudioTrackAsset; // Dynamic asset to stream mp3 audio
  @input audioComponent: AudioComponent; 


  private repeatUpdateLocation!: DelayedCallbackEvent;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.start.bind(this));

    this.repeatUpdateLocation = this.createEvent("DelayedCallbackEvent");
    this.repeatUpdateLocation.bind(() => {
      const locationService = GeoLocation.createLocationService();
      locationService.getCurrentPosition(
        (pos) => {
          this.fetchAndDisplayNearbyNotes(
            pos.latitude,
            pos.longitude,
            pos.altitude || 0
          );
        },
        (err) => {
          print("GPS error: " + err);
        }
      );
      this.repeatUpdateLocation.reset(2.0);
    });
  }

  start() {
    const locationService = GeoLocation.createLocationService();
    locationService.getCurrentPosition(
      (pos) => {
        this.fetchAndDisplayNearbyNotes(
          pos.latitude,
          pos.longitude,
          pos.altitude || 0
        );
      },
      (err) => {
        print("GPS error: " + err);
      }
    );
    this.repeatUpdateLocation.reset(0.0);
  }

  private async fetchAndDisplayNearbyNotes(
    userLat: number,
    userLon: number,
    userAlt: number
  ) {
    const url = `https://getnearbyrecordings-7qnob2z5uq-uc.a.run.app/?latitude=${userLat}&longitude=${userLon}&radiusFt=50`;

    const request = new Request(url, { method: "GET" });
    const response = await this.remoteServiceModule.fetch(request);
    if (response.status !== 200) return;

    const notes = JSON.parse(await response.text());
    const cam = (global.scene as any).getMainCamera();
    const userPos = cam.getTransform().getWorldPosition();

    notes.forEach((note: any) => {
      const offset = this.gpsOffsetVec3(
        userLat,
        userLon,
        userAlt,
        note.latitude,
        note.longitude,
        note.altitude || 0
      );

      if (offset.length > 15.24) return;

      const noteObj = this.notePrefab.instantiate(this.getSceneObject());
      noteObj.getTransform().setWorldPosition(userPos.add(offset.uniformScale(0.01)));

      const textComp = noteObj.getComponent("Component.Text3D") || noteObj.getComponent("Component.Text");

      // TEXT NOTE
      if (note.type === "text" && note.base64 && textComp) {
        const decoded = atob(note.base64.replace(/^data:text\/plain;base64,/, ""));
        textComp.text = decoded;
      }

      // AUDIO NOTE
      else if (note.type === "audio" && note.base64 && textComp) {
        textComp.text = "Audio note from " + (note.username || "someone");
        this.audioComponent.audioTrack = this.audioOutputAsset;
        const touchComp = noteObj.getComponent("Component.TouchComponent");
        if (touchComp) {
          touchComp.onTap.add(() => {
            this.audioComponent.play(1);
          });
        }
      }
    });
  }

  private gpsOffsetVec3(
    userLat: number,
    userLon: number,
    userAlt: number,
    noteLat: number,
    noteLon: number,
    noteAlt: number
  ): vec3 {
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos(userLat * Math.PI / 180);
    const dx = (noteLon - userLon) * metersPerDegLon;
    const dz = (noteLat - userLat) * metersPerDegLat;
    const dy = noteAlt - userAlt;
    return new vec3(dx, dy, dz);
  }
}
  */

declare function atob(str: string): string;

@component
export class FetchNote extends BaseScriptComponent {
  @input notePrefab!: ObjectPrefab; // Prefab to display each note
  // Import the RemoteServiceModule and RemoteMediaModule
  private remoteServiceModule: RemoteServiceModule = require('LensStudio:RemoteServiceModule');
  private remoteMediaModule: RemoteMediaModule = require('LensStudio:RemoteMediaModule');

  @input audioComponent: AudioComponent; 

  private repeatUpdateLocation!: DelayedCallbackEvent;

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.start.bind(this));

    this.repeatUpdateLocation = this.createEvent("DelayedCallbackEvent");
    this.repeatUpdateLocation.bind(() => {
      const locationService = GeoLocation.createLocationService();
      locationService.getCurrentPosition(
        (pos) => {
          this.fetchAndDisplayNearbyNotes(
            pos.latitude,
            pos.longitude,
            pos.altitude || 0
          );
        },
        (err) => {
          print("GPS error: " + err);
        }
      );
      this.repeatUpdateLocation.reset(2.0);
    });
  }

  start() {
    const locationService = GeoLocation.createLocationService();
    locationService.getCurrentPosition(
      (pos) => {
        this.fetchAndDisplayNearbyNotes(
          pos.latitude,
          pos.longitude,
          pos.altitude || 0
        );
      },
      (err) => {
        print("GPS error: " + err);
      }
    );
    this.repeatUpdateLocation.reset(0.0);
  }

  private async fetchAndDisplayNearbyNotes(
    userLat: number,
    userLon: number,
    userAlt: number
  ) {
    const url = `https://getnearbyrecordings-7qnob2z5uq-uc.a.run.app/?latitude=${userLat}&longitude=${userLon}&radiusFt=50`;

    const request = new Request(url, { method: "GET" });
    const response = await this.remoteServiceModule.fetch(request);
    if (response.status !== 200) {
      return;
    }

    const notes = JSON.parse(await response.text());
    const cam = (global.scene as any).getMainCamera();
    const userPos = cam.getTransform().getWorldPosition();

    notes.forEach((note: any) => {
      const offset = this.gpsOffsetVec3(
        userLat,
        userLon,
        userAlt,
        note.latitude,
        note.longitude,
        note.altitude || 0
      );

      // Only display notes within ~15.24 meters
      if (offset.length > 15.24) return;

      const noteObj = this.notePrefab.instantiate(this.getSceneObject());
      noteObj.getTransform().setWorldPosition(
        userPos.add(offset.uniformScale(0.01))
      );

      const textComp = noteObj.getComponent("Component.Text3D") ||
                       noteObj.getComponent("Component.Text");

      // TEXT NOTE: decode and display the text note
      if (note.type === "text" && note.base64 && textComp) {
        const decoded = atob(
          note.base64.replace(/^data:text\/plain;base64,/, "")
        );
        textComp.text = decoded;
      }
      // AUDIO NOTE: load and play the audio note from the remote URL
      else if (note.type === "audio" && note.base64) {
        if (textComp) {
          textComp.text = "Audio note from " + (note.username || "someone");
        }
        // Create a resource from the URL provided (assumed to be in note.base64)
        const resource = this.remoteServiceModule.makeResourceFromUrl(url); // name of the table label
        if (resource) {
          this.remoteMediaModule.loadResourceAsAudioTrackAsset(
            resource,
            (audioAsset: AudioTrackAsset) => {
              // Assign the downloaded audio asset to the audio component
              this.audioComponent.audioTrack = audioAsset;
            },
            (error: string) => {
              print("Error loading audio asset: " + error);
            }
          );
        } else {
          print("Error: Failed to create resource from URL for audio note.");
        }
        // Add a tap handler to play the audio when the note is tapped
        const touchComp = noteObj.getComponent("Component.TouchComponent");
        if (touchComp) {
          touchComp.onTap.add(() => {
            this.audioComponent.play(1);
          });
        }
      }
    });
  }

  private gpsOffsetVec3(
    userLat: number,
    userLon: number,
    userAlt: number,
    noteLat: number,
    noteLon: number,
    noteAlt: number
  ): vec3 {
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos(userLat * Math.PI / 180);
    const dx = (noteLon - userLon) * metersPerDegLon;
    const dz = (noteLat - userLat) * metersPerDegLat;
    const dy = noteAlt - userAlt;
    return new vec3(dx, dy, dz);
  }
}
