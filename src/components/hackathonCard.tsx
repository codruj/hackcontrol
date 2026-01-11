import Link from "next/link";
import Card from "./card";

export interface hackathonCardProps {
  name: string;
  description: string;
  url?: string;
  showCode?: boolean;
}

const HackathonCard = ({ name, description, url, showCode = false }: hackathonCardProps) => {
  return (
    <>
      {Boolean(url) ? (
        <Link
          href={`/app/${url}`}
          className="flex max-w-sm flex-col items-center"
        >
          <Card name={name} description={description} url={url} showCode={showCode} />
        </Link>
      ) : (
        <div className="flex max-w-xs flex-col items-center">
          <Card name={name} description={description} showCode={showCode} />
        </div>
      )}
    </>
  );
};

export default HackathonCard;
