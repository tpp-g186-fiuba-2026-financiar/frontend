import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../next/ui/Icon';

// Marco de las páginas sueltas a las que se llega desde un mail (verificar la
// cuenta, restablecer la contraseña), con el mismo diseño que la portada.
function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
    const navigate = useNavigate();
    return (
        <div className="nx-landing">
            <div className="nx-bg-glow" />
            <div className="nx-bg-grid" />
            <header className="nx-land-top">
                <button type="button" className="nx-brand" onClick={() => navigate('/')}>
                    <span className="nx-brand-mark">
                        <Icon name="trend" />
                    </span>
                    <span className="nx-brand-name">
                        Financi<b>Ar</b>
                    </span>
                </button>
            </header>
            <main className="nx-auth">
                <section className="nx-card nx-auth-card">
                    <h2>{title}</h2>
                    {children}
                </section>
            </main>
        </div>
    );
}

export default AuthFrame;
