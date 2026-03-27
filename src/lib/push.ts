"use client";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration;
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!("PushManager" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  return subscription;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}
