import { Platform } from 'react-native';
import { Mixpanel } from 'mixpanel-react-native';
import DeviceInfo from 'react-native-device-info';

const mixpanel = new Mixpanel('62a4ac8105c65d1ea9e104a6f5658038', true); // true = autocapture
mixpanel.init();

export const track = (event: string, props?: Record<string, unknown>) => {
  mixpanel.track(event, props);
};

export const identify = (userId: string, traits?: Record<string, unknown>) => {
  mixpanel.identify(userId);
  if (traits) mixpanel.getPeople().set(traits);
};

export async function getDeviceContext() {
  const [
    deviceId,
    brand,
    model,
    deviceName,
    systemVersion,
    appVersion,
    isEmulator,
    totalMemory,
    carrier,
  ] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.getBrand(),
    DeviceInfo.getModel(),
    DeviceInfo.getDeviceName(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getVersion(),
    DeviceInfo.isEmulator(),
    DeviceInfo.getTotalMemory(),
    DeviceInfo.getCarrier(),
  ]);

  return {
    deviceId,
    brand,
    model,
    deviceName,
    systemVersion,
    appVersion,
    isEmulator,
    totalMemory,
    carrier,
  };
}

export async function identifyDevice(): Promise<void> {
  const ctx = await getDeviceContext();
  const osName = Platform.OS === 'ios' ? 'iOS' : 'Android';
  identify(ctx.deviceId, {
    $device: ctx.model,
    $os: `${osName} ${ctx.systemVersion}`,
    device_name: ctx.deviceName,
    carrier: ctx.carrier,
    app_version: ctx.appVersion,
    is_emulator: ctx.isEmulator,
    device_brand: ctx.brand,
    total_memory_bytes: ctx.totalMemory,
  });
}