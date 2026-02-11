import AnimationRunner from "./components/AnimationRunner";
import AnimationShell from "./components/AnimationShell";

export default function HomePage() {
  return (
    <>
      <AnimationShell showUploadLink />
      <AnimationRunner />
    </>
  );
}
