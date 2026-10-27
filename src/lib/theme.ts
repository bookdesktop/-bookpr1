// ธีม light/dark: เก็บค่าที่ผู้ใช้เลือกใน localStorage ถ้าไม่เคยเลือกจะตามระบบปฏิบัติการ
// สคริปต์นี้รันใน <head> ก่อนหน้าเว็บแสดงผล จึงไม่กะพริบ (ดู Next guide: preventing-flash-before-hydration)

export const THEME_STORAGE_KEY = "theme";

export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {}
}
