require("LensStudio:RawLocationModule");
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { MicrophoneRecorder } from "./MicrophoneRecorder";


@component
export class SendAudioToFirebase extends BaseScriptComponent {
  @input
  microphoneRecorder: MicrophoneRecorder;

  private interactable: Interactable;
  private httpEndpointUrl: string = "https://createrecording-7qnob2z5uq-uc.a.run.app/";
  // Remote service module for fetching data
  private remoteServiceModule: RemoteServiceModule = require("LensStudio:RemoteServiceModule");
  private locationService: LocationService = GeoLocation.createLocationService();

  onAwake() {
    this.interactable = this.sceneObject.getComponent(Interactable.getTypeName());
    this.locationService.accuracy = GeoLocationAccuracy.High;

    this.interactable.onTriggerStart.add(() => {
      this.sendAudio();
    });
  }

  async sendAudio() {
    print("Send audio button pressed."); // Debug line

    /* if (this.microphoneRecorder.recordingDuration <= 0) {
      print("No audio recorded.");
      return;
    } */

    const audioData = this.microphoneRecorder["recordedAudioFrames"]; // Access private variable.

   /*  if (!audioData || audioData.length === 0) {
      print("No audio data to send.");
      return;
    } */

    const combinedAudioBuffer = this.combineAudioFrames(audioData);

    let locationData = await this.getLocationData();


    const formData = {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        altitude: locationData.altitude,
        timestamp: locationData.timestamp,
        locationSource: locationData.locationSource,
        userName: "dummyUser",
        recording: combinedAudioBuffer,
        text: "hello",
        recordingType: "audio",
        recordingFormat: "wav",
        recordingDuration: "dummyDuration",
        fakedata: "dummyData"
    };

    try {
      let request = new Request(this.httpEndpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        let response = await this.remoteServiceModule.fetch(request);

        if (response.status === 200) {
            print("Audio sent to HTTP endpoint successfully!! LFG");
            const responseData = await response.json();
            print("Response from server:" + responseData);
        } else {
            print("Error sending audio to HTTP endpoint: " + response.status + response.statusText);
        }
    } catch (error) {
        print("Error sending audio to HTTP endpoint: " + error);
    }

  }

  private getLocationData(): Promise<{ latitude: number, longitude: number, altitude: number, timestamp: Date, locationSource: string }> {
    return new Promise((resolve, reject) => {
      this.locationService.getCurrentPosition(
        (geoPosition) => {
          resolve({
            latitude: geoPosition.latitude,
            longitude: geoPosition.longitude,
            altitude: geoPosition.altitude,
            timestamp: geoPosition.timestamp,
            locationSource: geoPosition.locationSource
          });
        },
        (error) => {
          print("Location error: " + error);
          reject(error);
        }
      );
    });
  }
  // Combine audio frames into a single Float32Array
  private combineAudioFrames(audioFrames: any[]): Float32Array {
    let totalLength = 0;
    for (const frame of audioFrames) {
      totalLength += frame.audioFrame.length;
    }

    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;

    for (const frame of audioFrames) {
      combinedBuffer.set(frame.audioFrame, offset);
      offset += frame.audioFrame.length;
    }

    return combinedBuffer;
  }
}
