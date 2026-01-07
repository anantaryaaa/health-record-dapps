declare module "*.css";

declare module "*.webp" {
  import { StaticImageData } from "next/image";
  const value: StaticImageData;
  export default value;
}

declare module "*.jpg" {
  import { StaticImageData } from "next/image";
  const value: StaticImageData;
  export default value;
}

declare module "*.png" {
  import { StaticImageData } from "next/image";
  const value: StaticImageData;
  export default value;
}