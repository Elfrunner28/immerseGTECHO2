// @component
// export class TagSelector extends BaseScriptComponent {

//     @input component: Component;
//     @input entity: Entity;

//     @input textComponent: TextComponent;
//     @input buttonComponent: ButtonComponent;

//     @input vector2: Vector2;

//     private tags: string[] = ['All', 'Class', 'Friends'];
//     private currentTagIndex: number = 0;
//     private tagText: TextComponent;
//     private button: ButtonComponent;

//     constructor(entity: Entity) {
//         this.tagText = entity.addComponent(TextComponent);
//         this.tagText.text = this.tags[this.currentTagIndex];
//         this.tagText.fontSize = 24;
//         this.tagText.color = [1, 1, 1, 1];
//         this.tagText.anchor = new Vector2(1, 0); // Bottom right
//         this.tagText.position = new Vector2(0.9, 0.1); // Position in bottom right

//         // Create button component for interaction
//         this.button = entity.addComponent(ButtonComponent);
//         this.button.onClick = () => this.cycleTag();
//     }

//     private cycleTag(): void {
//         this.currentTagIndex = (this.currentTagIndex + 1) % this.tags.length;
//         this.tagText.text = this.tags[this.currentTagIndex];
//     }
// } 