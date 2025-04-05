import { Interactable } from "../SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
// InteractorEvent is not explicitly used after the changes, but might be useful for other interactions
// import { InteractorEvent } from "SpectaclesInteractionKit/Core/Interactor/InteractorEvent";
import NativeLogger from "../SpectaclesInteractionKit/Utils/NativeLogger"; // Added import for logging

declare function atob(str: string): string;

// Instantiate the logger
const log = new NativeLogger("FetchNoteLogger");

@component
export class FetchNote extends BaseScriptComponent {
    @input() notePrefab!: ObjectPrefab; // Prefab for notes (Ensure this prefab has an Interactable component)

    // Removed createButton input as interaction happens on the note prefabs themselves
    // @input() createButton: Interactable;

    // Ensure this AudioComponent is assigned in the Inspector panel in Lens Studio
    // It will be used to play the audio from any interacted note.
    @input() audioComponent!: AudioComponent;

    @input interactable: Interactable;

    private remoteServiceModule: RemoteServiceModule = require('LensStudio:RemoteServiceModule');
    private remoteMediaModule: RemoteMediaModule = require('LensStudio:RemoteMediaModule');
    private repeatUpdateLocation!: DelayedCallbackEvent;


    // Keep track of instantiated notes to potentially manage them later (e.g., cleanup)
    private instantiatedNotes: SceneObject[] = [];

    onAwake() {
        log.d("FetchNote Script Awake");
        print("FetchNote Script Awake");

        // Bind the onStart function to the OnStartEvent
        this.createEvent("OnStartEvent").bind(() => {
            this.onStart();
        });

        // Setup the repeating timer for location updates
        this.repeatUpdateLocation = this.createEvent("DelayedCallbackEvent");
        this.repeatUpdateLocation.bind(() => {
            log.d("Updating location and fetching notes...");
            print("Updating location and fetching notes...");
            this.updateLocationAndFetch();
            // Reset the timer to run again after 2 seconds
            this.repeatUpdateLocation.reset(2.0); // Update every 2 seconds
        });

        // Optional: Run simulation test on awake for debugging in Lens Studio
        // this.runSimulationTest(); // Uncomment if needed for testing
    }

    onStart() {
        log.d("FetchNote Script Started");
        print("FetchNote Script Started");

        this.runSimulationTest();

        // Initial location fetch when the lens starts
        this.updateLocationAndFetch();
        // Start the repeating update timer immediately (or with a short delay)
        this.repeatUpdateLocation.reset(0.1); // Start updates shortly after start

        // --- Removed the createButton listener ---
        // The interaction logic is now handled within fetchAndDisplayNearbyNotes
        // where listeners are added to each instantiated note prefab.
        // let onTriggerStartCallback = (event: InteractorEvent) => {
        //   // This was incorrect - we don't have a single playAudio function here
        //   // this.playAudio()
        // };
        // this.createButton.onInteractorTriggerStart(onTriggerStartCallback);
    }

    private updateLocationAndFetch() {
        // Clear previously instantiated notes (optional, depends on desired behavior)
        // If you want notes to persist across updates, remove this loop.
        // If you want only the *currently* nearby notes displayed, keep it.
       /*  this.instantiatedNotes.forEach(note => {
            if (note && !note.isDestroyed()) {
                note.destroy();
            }
        });
        this.instantiatedNotes = []; // Reset the array
 */
        // Get current location
        const locationService = GeoLocation.createLocationService();
        locationService.getCurrentPosition(
            (pos) => {
                log.d(`Location acquired: Lat ${pos.latitude}, Lon ${pos.longitude}`);
                print(`Location acquired: Lat ${pos.latitude}, Lon ${pos.longitude}`);
                this.fetchAndDisplayNearbyNotes(
                    pos.latitude,
                    pos.longitude,
                    pos.altitude || 0 // Use 0 if altitude is not available
                );
            },
            (err) => {
                log.e("GPS error: " + err); // Use log.e for errors
                print("GPS error: " + err);
            }
        );
    }

    private async fetchAndDisplayNearbyNotes(
        userLat: number,
        userLon: number,
        userAlt: number
    ) {
        const radiusMeters = 15.24; // 50 feet in meters
        const url = `https://getnearbyrecordings-7qnob2z5uq-uc.a.run.app/?latitude=${userLat}&longitude=${userLon}&radiusFt=50`; // Using radiusFt=50 as per original URL

        log.d("Fetching notes from URL: " + url);
        print("Fetching notes from URL: " + url);

        try {
            const request = new Request(url, { method: "GET" });
            const response = await this.remoteServiceModule.fetch(request);

            if (response.status !== 200) {
                log.e(`Failed to fetch notes. Status: ${response.status}`);
                print(`Failed to fetch notes. Status: ${response.status}`);
                return;
            }

            const notes = await response.json();
            log.d(`Received ${notes.length} notes from backend.`);
            print(`Received ${notes.length} notes from backend.`);
            // print("Notes data: " + JSON.stringify(notes)); // Uncomment for detailed data logging

            const cam = (global.scene as any).getMainCamera();
            if (!cam) {
                log.e("Could not get main camera!");
                print("Could not get main camera!");
                return;
            }
            const userPos = cam.getTransform().getWorldPosition();

            notes.forEach((note: any) => {
                // Basic validation of note data
                if (note.latitude === undefined || note.longitude === undefined || !note.type) {
                    log.w("Skipping note due to missing data: " + JSON.stringify(note));
                    print("Skipping note due to missing data: " + JSON.stringify(note));
                    return; // Skip this note if essential data is missing
                }

                const noteLat = parseFloat(note.latitude);
                const noteLon = parseFloat(note.longitude);
                const noteAlt = parseFloat(note.altitude || '0'); // Use 0 if altitude is missing

                if (isNaN(noteLat) || isNaN(noteLon) || isNaN(noteAlt)) {
                    log.w("Skipping note due to invalid coordinate data: " + JSON.stringify(note));
                    print("Skipping note due to invalid coordinate data: " + JSON.stringify(note));
                    return; // Skip if coordinates are not valid numbers
                }

                // Calculate offset relative to the user
                const offset = this.gpsOffsetVec3(
                    userLat, userLon, userAlt,
                    noteLat, noteLon, noteAlt
                );

                // Check distance - Convert radiusMeters if needed, or use the offset length directly
                // The original code checked offset.length > 15.24, which seems correct for the 50ft radius
                if (offset.length > radiusMeters) {
                    // log.d(`Note too far (${offset.length.toFixed(2)}m > ${radiusMeters}m), skipping.`);
                    // print(`Note too far (${offset.length.toFixed(2)}m > ${radiusMeters}m), skipping.`);
                    return; // Skip notes outside the radius
                }

                // --- Instantiate the Note Prefab ---
                if (!this.notePrefab) {
                    log.e("notePrefab is not assigned in the Inspector!");
                    print("notePrefab is not assigned in the Inspector!");
                    return; // Stop processing if prefab isn't set
                }
                const noteObj = this.notePrefab.instantiate(this.getSceneObject());
                if (!noteObj) {
                    log.e("Failed to instantiate notePrefab!");
                    print("Failed to instantiate notePrefab!");
                    return; // Stop if instantiation failed
                }

                // Add to list for potential cleanup later
                this.instantiatedNotes.push(noteObj);

                // Position the note object relative to the user
                // Scaling the offset might be needed depending on your scene scale
                noteObj.getTransform().setWorldPosition(userPos.add(offset)); // Adjust scaling if necessary (e.g., offset.uniformScale(0.1))

                log.d(`Instantiated note at offset: ${offset.toString()}`);
                print(`Instantiated note at offset: ${offset.toString()}`);

                // --- Handle Text Content ---
                const textComp = noteObj.getComponent("Component.Text3D") || noteObj.getComponent("Component.Text");
                if (note.type === "text" && note.base64) {
                    if (textComp) {
                        try {
                            const decoded = atob(note.base64.replace(/^data:text\/plain;base64,/, ""));
                            textComp.text = decoded;
                            log.d("Set text content for note.");
                            print("Set text content for note.");
                        } catch (e) {
                            log.e("Error decoding base64 text: " + e);
                            print("Error decoding base64 text: " + e);
                            textComp.text = "[Error Decoding Text]";
                        }
                    } else {
                        log.w("Text note received, but no Text/Text3D component found on prefab.");
                        print("Text note received, but no Text/Text3D component found on prefab.");
                    }
                }
                // --- Handle Audio Content and Interaction ---
                else if (note.type === "audio" && note.recordingUrl) {
                    if (textComp) {
                        // Set placeholder text for audio notes
                        textComp.text = "Audio note from " + (note.username || "someone");
                    }

                    // Get the Interactable component from THIS instantiated note object

                    if (this.interactable) {
                        log.d("Found Interactable on audio note prefab. Adding listener.");
                        print("Found Interactable on audio note prefab. Adding listener.");

                        // Add the interaction listener directly to this note's Interactable
                        this.interactable.onTriggerStart.add(() => {
                            log.d(`Interaction triggered for note with URL: ${note.recordingUrl}`);
                            print(`Interaction triggered for note with URL: ${note.recordingUrl}`);

                            if (!this.audioComponent) {
                                log.e("AudioComponent is not assigned in the Inspector! Cannot play audio.");
                                print("AudioComponent is not assigned in the Inspector! Cannot play audio.");
                                return;
                            }
                             if (!this.remoteMediaModule || !this.remoteServiceModule) {
                                log.e("Remote Media or Service Module not available!");
                                print("Remote Media or Service Module not available!");
                                return;
                            }


                            // Use the specific recordingUrl from this note's data
                            const resource = this.remoteServiceModule.makeResourceFromUrl(note.recordingUrl);
                            if (resource) {
                                this.remoteMediaModule.loadResourceAsAudioTrackAsset(
                                    resource,
                                    (audioAsset: AudioTrackAsset) => {
                                        if (audioAsset) {
                                            log.d("Audio asset loaded successfully.");
                                            print("Audio asset loaded successfully.");
                                            this.audioComponent.audioTrack = audioAsset;
                                            this.audioComponent.play(1); // Play once
                                        } else {
                                            log.e("Failed to load audio asset (asset is null).");
                                            print("Failed to load audio asset (asset is null).");
                                        }
                                    },
                                    (error: string) => {
                                        log.e("Error loading audio asset: " + error);
                                        print("Error loading audio asset: " + error);
                                    }
                                );
                            } else {
                                log.e("Error: Failed to create resource from URL for audio note: " + note.recordingUrl);
                                print("Error: Failed to create resource from URL for audio note: " + note.recordingUrl);
                            }
                        });
                    } else {
                        log.w("Audio note received, but no Interactable component found on the notePrefab. Cannot play audio on interaction.");
                        print("Audio note received, but no Interactable component found on the notePrefab. Cannot play audio on interaction.");
                    }
                } else if (note.type) {
                     log.w(`Unhandled note type: ${note.type} or missing data.`);
                     print(`Unhandled note type: ${note.type} or missing data.`);
                }
            }); // End of notes.forEach

        } catch (error) {
            log.e("Error during fetch or processing notes: " + error);
            print("Error during fetch or processing notes: " + error);
             if (error instanceof Error && error.stack) {
                log.e("Stack trace: " + error.stack);
                 print("Stack trace: " + error.stack);
            }
        }
    }

    // Calculates the world space offset vector from user GPS to note GPS
    private gpsOffsetVec3(
        userLat: number, userLon: number, userAlt: number,
        noteLat: number, noteLon: number, noteAlt: number
    ): vec3 {
        const metersPerDegLat = 111320.0; // Approx meters per degree latitude
        // Approx meters per degree longitude (adjusts based on latitude)
        const metersPerDegLon = 111320.0 * Math.cos(userLat * Math.PI / 180.0);

        const dx = (noteLon - userLon) * metersPerDegLon; // East-West difference in meters
        const dz = (noteLat - userLat) * metersPerDegLat; // North-South difference in meters (Lens Studio Z is often depth/North)
        const dy = noteAlt - userAlt;                      // Vertical difference in meters

        // Return the offset vector (Check axis conventions: X=East, Y=Up, Z=North is common)
        return new vec3(dx, dy, dz);
    }

    // --- Simulation Test Function (Keep for debugging if needed) ---
    private async runSimulationTest() {
        log.d("Running Simulation Test...");
        print("Running Simulation Test...");
        // Example coordinates (London Eye area)
        const userLat = 51.50999832153332; // Example Lat
        const userLon = -0.11999999731779099; // Example Lon
        const userAlt = 0;       // Example Alt

        const url = `https://getnearbyrecordings-7qnob2z5uq-uc.a.run.app/?latitude=${userLat}&longitude=${userLon}&radiusFt=500`; // Increased radius for test

        try {
            const request = new Request(url, { method: "GET" });
            const response = await this.remoteServiceModule.fetch(request);

            if (response.status !== 200) {
                log.e(`Simulation Test Failed: HTTP Error ${response.status}`);
                print(`Simulation Test Failed: HTTP Error ${response.status}`);
                return;
            }

            const notes = await response.json();
            log.d("Simulation Test: Data Received from Backend:");
            print("Simulation Test: Data Received from Backend:");
            print(JSON.stringify(notes, null, 2)); // Pretty print JSON

            if (notes && notes.length > 0) {
                log.d("Simulation Test: Data Structure Validation:");
                print("Simulation Test: Data Structure Validation:");
                notes.forEach((note: any, index: number) => {
                    print(`- Note ${index + 1} -`);
                    // Add more detailed checks if needed
                     print(`  Type: ${note.type}, Lat: ${note.latitude}, Lon: ${note.longitude}, URL: ${note.recordingUrl || 'N/A'}, Base64: ${(note.base64 ? 'Present' : 'N/A')}`);
                });
                 print("Simulation Test: Data Validation Complete.");
            } else {
                 print("Simulation Test: No Notes Received.");
            }
             print("Simulation Test Completed Successfully.");
        } catch (error) {
            log.e("Simulation Test Failed: " + error);
            print("Simulation Test Failed: " + error);
             if (error instanceof Error && error.stack) {
                 print("Stack trace: " + error.stack);
            }
        }
    }
}