/**
 * GooeyFilter — filtre SVG "gooey" (effet fusion liquide) à appliquer via
 * `style={{ filter: "url(#<id>)" }}` sur un conteneur d'éléments animés.
 *
 * Exemple :
 *   <GooeyFilter id="gooey-menu" strength={5} />
 *   <div style={{ filter: "url(#gooey-menu)" }}> ...boutons animés... </div>
 */
const GooeyFilter = ({
  id = "goo-filter",
  strength = 10,
}: {
  id?: string;
  strength?: number;
}) => {
  return (
    <svg className="hidden absolute" aria-hidden="true">
      <defs>
        <filter id={id}>
          <feGaussianBlur in="SourceGraphic" stdDeviation={strength} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
};

export { GooeyFilter };
