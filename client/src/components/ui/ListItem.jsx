export default function ListItem({ icon, avatar, title, description, trailing, onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`list-item ${onClick ? 'w-full text-left' : ''}`} onClick={onClick}>
      {(icon || avatar) && (
        <div className="list-item-leading">
          {avatar || (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}>
              {icon}
            </div>
          )}
        </div>
      )}
      <div className="list-item-content">
        <div className="list-item-title">{title}</div>
        {description && <div className="list-item-description">{description}</div>}
        {children}
      </div>
      {trailing && <div className="list-item-trailing">{trailing}</div>}
    </Tag>
  )
}
