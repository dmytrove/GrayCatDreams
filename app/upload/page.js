import Link from "next/link";
import UploadForm from "./UploadForm";

export const metadata = {
  title: "Create your dream – GrayCatDreams",
  description: "Upload photos, remove background, get a shareable floating dream",
};

export default function UploadPage() {
  return (
    <div className="upload-page">
      <div className="back">
        <Link href="/">← Back to demo</Link>
      </div>
      <h1>Create your dream</h1>
      <p>
        Upload 1–10 photos (e.g. of your cat). Backgrounds are removed in your browser, then you get a shareable link to a floating animation.
      </p>
      <UploadForm />
    </div>
  );
}
