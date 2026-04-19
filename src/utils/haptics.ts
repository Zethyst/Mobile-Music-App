import Haptic from 'react-native-haptic-feedback';

const opts = { enableVibrateFallback: true as const };

/** Picker dots, small toggles */
export function hapticSelection(): void {
  Haptic.trigger('selection', opts);
}

/** Secondary controls: nav icons, back, mute, sync */
export function hapticLight(): void {
  Haptic.trigger('impactLight', opts);
}

/** Skip, search submit, track row tap, album tap */
export function hapticMedium(): void {
  Haptic.trigger('impactMedium', opts);
}

/** Play / pause — primary transport */
export function hapticHeavy(): void {
  Haptic.trigger('impactHeavy', opts);
}

/** Add-to-queue success, positive confirmation */
export function hapticSuccess(): void {
  Haptic.trigger('notificationSuccess', opts);
}

/** Destructive / clear queue / boundary */
export function hapticWarning(): void {
  Haptic.trigger('notificationWarning', opts);
}

/** Slider seek complete, reorder drop */
export function hapticSeekComplete(): void {
  Haptic.trigger('impactMedium', opts);
}

/** Queue drag handle grab */
export function hapticDragStart(): void {
  Haptic.trigger('dragStart', opts);
}
