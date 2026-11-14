import { Icon, type IconName } from "@/components/ui/Icon";

export function InfoCard({
  icon,
  number,
  title,
  text,
}: {
  icon: IconName;
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="principle-card">
      <div>
        <Icon name={icon} size={19} />
        <span>{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
